import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import { useGeographic } from 'ol/proj';
import {Icon, Stroke, Style} from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import { Vector, XYZ } from 'ol/source';
import {defaults as defaultControls} from 'ol/control';
import Link from 'ol/interaction/Link';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import {defaults as defaultInteractions} from 'ol/interaction/defaults';
import { Temporal } from 'temporal-polyfill';
import { Features as INaturalistFeatures, Tiles as INaturalistTiles } from './source/inaturalist';
import { MaplifySource } from './source/maplify';
import { PointInTime } from './PointInTime';
import TimeControl from './control/TimeControl';
import { Query } from './Query';
import Feature, { FeatureLike } from 'ol/Feature';
import { TimeScale } from './TimeScale';
import { TimeScaleControl } from './control/TimeScaleControl';
import '@formatjs/intl-durationformat/polyfill'
import { Ferries } from './source/wsf';
import TextStyle from 'ol/style/Text';
import {platformModifierKeyOnly} from 'ol/events/condition';
import Select from 'ol/interaction/Select';
import DragBox from 'ol/interaction/DragBox';
import {transformExtent} from 'ol/proj';
import 'ol/ol.css';
import './index.css';
import { Travel } from './source/travel';
import { Geometry, LineString, Point } from 'ol/geom';
import { TaxonView } from './control/TaxonView';
import { Collection } from 'ol';
import { observationStyle, pliantObservationStyle, selectedObservationStyle } from './style';
import NewObservationControl from './control/NewObservationControl';
import { SessionStorageSource } from './source/sessionStorage';

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

const inaturalistSource = new INaturalistFeatures({query, pit, timeScale});
const inaturalistLayer = new VectorLayer({
  declutter: true,
  source: inaturalistSource,
  style: observationStyle,
});

const sightingSource = new MaplifySource({query, pit, timeScale});

const sightingLayer = new VectorLayer({
  declutter: true,
  source: sightingSource,
  style: observationStyle,
});

const travelSource = new Travel({sources: [inaturalistSource, sightingSource]});
const travelLayer = new VectorLayer({
  maxResolution: 80,
  source: travelSource,
  style: (feature: FeatureLike) => {
    const geometry = feature.getGeometry() as LineString;
    const styles = [
      // linestring
      new Style({
        stroke: new Stroke({
          color: '#ffcc33',
          width: 2,
        }),
      }),
    ];
    geometry.forEachSegment(function (start, end) {
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const rotation = Math.atan2(dy, dx);
      // arrows
      styles.push(
        new Style({
          geometry: new Point([(end[0] + start[0]) / 2, (end[1] + start[1]) / 2]),
          image: new Icon({
            src: 'arrow.png',
            anchor: [0.75, 0.5],
            rotateWithView: true,
            rotation: -rotation,
          }),
        }),
      );
    });
    return styles;
  },
});

const setTime = pit.set.bind(pit);
setTime(link.track('t', setTime));
pit.on('change', () => {
  link.update('t', pit.toNaiveISO());
  sightingSource.changed();
});
if (!pit.value)
  pit.set(Temporal.Now.instant());

const select = new Select({
  layers: [sightingLayer, inaturalistLayer],
  style: selectedObservationStyle,
});
const dragBox = new DragBox({
  condition: platformModifierKeyOnly,
});

const newObservations = new SessionStorageSource({key: 'new-observations'});
const newObservationsLayer = new VectorLayer({source: newObservations});
const modify = new Modify({source: newObservations, style: pliantObservationStyle});
const snap = new Snap({source: newObservations});

const observations = new Collection<Feature<Geometry>>();

// const observationsControl = new ObservationsControl({pit});
const selection = select.getFeatures();
selection.on('add', e => {
  console.log(e.element.getProperties());
});

const showObservations = () => {
  const features = [inaturalistSource, sightingSource].flatMap(source => source.getFeatures());
  observations.clear();
  observations.extend(features);
  observations.changed();
};
sightingSource.on('featuresloadend', showObservations);
inaturalistSource.on('featuresloadend', showObservations);
showObservations();
const timeScaleControl = new TimeScaleControl({timeScale});

const taxonView = new TaxonView({observations, query, selection});

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
  controls: defaultControls().extend([new TimeControl({pit}), timeScaleControl, taxonView]),
  interactions: defaultInteractions().extend([dragBox, link, modify, select, snap]),
  layers: [
    new TileLayer({
      source: new XYZ({
        urls: [
          'https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
          'https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
        ],
      })
    }),
    travelLayer,
    iNaturalistTileLayer,
    inaturalistLayer,
    sightingLayer,
    newObservationsLayer,
    ferryLayer,
  ],
  view,
});

newObservations.on('featuresloadend', () => {
  const newObservationControl = new NewObservationControl({map, source: newObservations});
  map.addControl(newObservationControl);
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
  var sightingLayer: any;
  var view: any;
}
window.view = view;
window.sightingLayer = sightingLayer;
