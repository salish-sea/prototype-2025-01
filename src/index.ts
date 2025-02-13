import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import { useGeographic } from 'ol/proj';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';
import VectorLayer from 'ol/layer/Vector';
import { XYZ } from 'ol/source';
import {defaults as defaultControls} from 'ol/control.js';
import Link from 'ol/interaction/Link.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults';
import { Temporal } from 'temporal-polyfill';
import { Features as INaturalistFeatures, Tiles as INaturalistTiles, fetchSpeciesPresent } from './source/inaturalist';
import { MaplifySource } from './source/maplify';
import { PointInTime } from './PointInTime';
import TimeControl from './control/TimeControl';
import ObservationsControl from './control/ObservationsControl';
import { Query } from './Query';
import TaxonControl from './control/TaxonControl';
import { FeatureLike } from 'ol/Feature';
import { TimeScale } from './TimeScale';
import { TimeScaleControl } from './control/TimeScaleControl';
import '@formatjs/intl-durationformat/polyfill'
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { all } from 'ol/loadingstrategy';
import { Ferries } from './source/wsf';
import TextStyle from 'ol/style/Text';
import {platformModifierKeyOnly} from 'ol/events/condition.js';
import Select from 'ol/interaction/Select.js';
import DragBox from 'ol/interaction/DragBox.js';
import {transformExtent} from 'ol/proj';
import 'ol/ol.css';
import './index.css';
import { ObservationProperties } from './observation';
import { Travel } from './source/travel';

useGeographic();

// TODO:
// - clusters
// - orcasound bouts (pending data work and API)

const wsdotKey = 'dd816e21-7394-414b-8f6d-57751494b0b1';

let location = [-122.450, 47.8];

const pit = new PointInTime();
const timeScale = new TimeScale(Temporal.Duration.from('P2D'));
const query = new Query('Cetacea');

const link = new Link({replace: true});
query.set(link.track('q', query.set.bind(query)) || 'Cetacea');
query.on('change', () => link.update('q', query.value));

timeScale.set(link.track('p', timeScale.set.bind(timeScale)));
timeScale.on('change', () => link.update('p', timeScale.value.toString()));
link.update('p', timeScale.value.toString());

const view = new View({
  center: location,
  projection: 'EPSG:3857',
  zoom: 9,
});

const observationStyle = (feature: FeatureLike) => {
  const observedAt: Temporal.Instant = feature.get('observedAt');
  const delta = pit.value?.until(observedAt) || new Temporal.Duration();
  const proportionOfScale = delta.abs().total('seconds') / timeScale.value.total('seconds');
  const hue = delta.sign < 0 ? 280 : 100;
  const opacity = Math.min(1, 0.3 * Math.pow(Math.min(1, proportionOfScale), -0.6));
  return new Style({
    image: new Circle({
      fill: new Fill({color: `hsl(${hue} 50% 50% / ${opacity})`}),
      stroke: delta.sign === 0 ? new Stroke({color: 'yellow', width: 2}) : undefined,
      radius: 5,
    })
  });
};

const herringSource = new VectorSource({
  format: new GeoJSON(),
  strategy: all,
  url: './herring-spawning.geojson',
});
const herringLayer = new VectorLayer({
  source: herringSource,
});

const inaturalistSource = new INaturalistFeatures({query, pit, timeScale});
const inaturalistLayer = new VectorLayer({
  source: inaturalistSource,
  // style: observationStyle,
});

const sightingSource = new MaplifySource({query, pit, timeScale});

const sightingLayer = new VectorLayer({
  source: sightingSource,
  // style: observationStyle,
});

const travelSource = new Travel({sources: [inaturalistSource, sightingSource]});
const travelLayer = new VectorLayer({
  source: travelSource,
});

const setTime = pit.set.bind(pit);
setTime(link.track('t', setTime));
pit.on('change', () => {
  link.update('t', pit.toNaiveISO());
  sightingSource.changed();
});
if (!pit.value)
  pit.set(Temporal.Now.instant());

const select = new Select({layers: [sightingLayer, inaturalistLayer]});
const dragBox = new DragBox({
  condition: platformModifierKeyOnly,
});

const observationsControl = new ObservationsControl({pit});
const selection = select.getFeatures();
const showObservations = () => {
  let features = selection.getArray();
  if (features.length === 0)
    features = [inaturalistSource, sightingSource].flatMap(source => source.getFeatures());
  features.sort((a, b) => {
    const {observedAt: aObservedAt} = a.getProperties() as ObservationProperties;
    const {observedAt: bObservedAt} = b.getProperties() as ObservationProperties;
    if (!aObservedAt)
      return -1;
    if (!bObservedAt)
      return 1;
    return Temporal.Instant.compare(aObservedAt, bObservedAt);
  });
  observationsControl.showObservations(features);
};
selection.on(['add', 'remove'], showObservations);
sightingSource.on('featuresloadend', showObservations);
inaturalistSource.on('featuresloadend', showObservations);
const taxonControl = new TaxonControl({query});
const timeScaleControl = new TimeScaleControl({timeScale});

const iNaturalistTiles = new INaturalistTiles({query});
const iNaturalistTileLayer = new TileLayer({
  opacity: 0.3,
  source: iNaturalistTiles,
});

const ferrySource = new Ferries(wsdotKey);
const ferryLayer = new VectorLayer({
  source: ferrySource,
  style: () => new Style({text: new TextStyle({text: '⛴️'})}),
});

const mainElement = document.createElement('main');
const mapElement = document.createElement('div');
mapElement.id = 'map';
mainElement.appendChild(mapElement);
document.body.appendChild(mainElement);

const map = new Map({
  target: mapElement,
  controls: defaultControls().extend([new TimeControl({pit}), observationsControl, taxonControl, timeScaleControl]),
  interactions: defaultInteractions().extend([link, select, dragBox]),
  layers: [
    new TileLayer({
      source: new XYZ({
        urls: [
          'https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
          'https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
        ],
      })
      // source: new Google({
      //   key: "AIzaSyBKcLuHvJYN7Q3uwKBHWx1h3R6YVfNW_FM",
      //   layerTypes: ['layerRoadmap'],
      //   mapType: 'terrain',
      // }),
    }),
    iNaturalistTileLayer,
    herringLayer,
    inaturalistLayer,
    sightingLayer,
    travelLayer,
    ferryLayer,
  ],
  view,
});

dragBox.on('boxend', () => {
  const boxExtent = transformExtent(dragBox.getGeometry().getExtent(), 'EPSG:3857', 'EPSG:4326');
  const features = sightingSource.getFeaturesInExtent(boxExtent).
    concat(inaturalistSource.getFeaturesInExtent(boxExtent));
  selection.clear();
  selection.extend(features);
  selection.changed();
});

// map.on('click', event => {
//   const features = map.getFeaturesAtPixel(event.pixel);
//   if (features.length === 0)
//     return;
//   observationsControl.showObservations(features);
// });

declare global {
  var fetchSpeciesPresent: any;
}
window.fetchSpeciesPresent = fetchSpeciesPresent;
