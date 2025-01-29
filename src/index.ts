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
import { INaturalistSource, fetchSpeciesPresent } from './source/inaturalist';
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

useGeographic();

// TODO:
// - clusters
// - orcasound bouts (pending data work and API)

// wsdot key dd816e21-7394-414b-8f6d-57751494b0b1

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

const inaturalistSource = new INaturalistSource({query, pit, timeScale});
const inaturalistLayer = new VectorLayer({
  source: inaturalistSource,
  style: observationStyle,
});

const sightingSource = new MaplifySource({query, pit, timeScale});

const sightingLayer = new VectorLayer({
  source: sightingSource,
  style: observationStyle,
});

const setTime = pit.set.bind(pit);
setTime(link.track('t', setTime));
pit.on('change', () => {
  link.update('t', pit.toNaiveISO());
  sightingSource.changed();
});
if (!pit.value)
  pit.set(Temporal.Now.instant());

const observationsControl = new ObservationsControl({pit});
const taxonControl = new TaxonControl({query});
const timeScaleControl = new TimeScaleControl({timeScale});

const map = new Map({
  target: 'map',
  controls: defaultControls().extend([new TimeControl({pit}), observationsControl, taxonControl, timeScaleControl]),
  interactions: defaultInteractions().extend([link]),
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
    herringLayer,
    inaturalistLayer,
    sightingLayer,
  ],
  view,
});
map.on('click', event => {
  const features = map.getFeaturesAtPixel(event.pixel);
  if (features.length === 0)
    return;
  observationsControl.showObservations(features);
});

declare global {
  var fetchSpeciesPresent: any;
}
window.fetchSpeciesPresent = fetchSpeciesPresent;
