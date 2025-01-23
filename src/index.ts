import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import { useGeographic } from 'ol/proj';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';
import VectorLayer from 'ol/layer/Vector';
import { Source, XYZ } from 'ol/source';
import {defaults as defaultControls} from 'ol/control.js';
import Link from 'ol/interaction/Link.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults';
import { Temporal } from 'temporal-polyfill';
import { INaturalistSource } from './source/inaturalist';
import { MaplifySource } from './source/maplify';
import { PointInTime } from './PointInTime';
import TimeControl from './control/TimeControl';
import ObservationsControl from './control/ObservationsControl';

useGeographic();

// TODO:
// - temporal scale
// - select iNaturalist taxon
// - info window

// wsdot key dd816e21-7394-414b-8f6d-57751494b0b1

// https://www.inaturalist.org/observations/258050998
let location = [-122.450, 47.8];

const pit = new PointInTime();

declare global {
  var map: Map;
  var view: View;
  var source: Source;
}

const view = new View({
  center: location,
  zoom: 9,
});

export const inaturalistSource = new INaturalistSource({
  taxon: 152871, // Cetacea
  pit,
});
const inaturalistLayer = new VectorLayer({
  source: inaturalistSource,
});

export const sightingSource = new MaplifySource({pit});

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(value, high));
}

const markerStyle = ({hue, opacity}: {hue: number, opacity: number}) => new Style({
  image: new Circle({
    fill: new Fill({color: `hsl(${hue.toFixed(0)} 50% 50% / ${opacity.toFixed(2)})`}),
    radius: 5,
  }),
});

const sightingLayer = new VectorLayer({
  source: sightingSource,
  style: (feature) => {
    const created: Temporal.Instant = feature.get('observedAt');
    const delta = pit.value?.until(created) || new Temporal.Duration();
    const absDeltaHours = Math.abs(delta.total('hours'));
    const hue = delta.sign < 0 ? 280 : 100;
    const opacity = Math.min(1, 0.5 * Math.pow(absDeltaHours, -0.5)); // power law, 1 hour delta = 50% opacity
    return new Style({
      image: new Circle({
        fill: new Fill({color: `hsl(${hue} 50% 50% / ${opacity})`}),
        radius: 5,
      })
    });
  },
});

const setTime = pit.set.bind(pit);
export const link = new Link({replace: true});
setTime(link.track('t', newValue => {
  console.log('link t param changed');
  setTime(newValue);
}));
pit.on('change', () => link.update('t', pit.toNaiveISO()));
if (!pit.value)
  pit.set(Temporal.Now.instant());

const observationsControl = new ObservationsControl({});

const map = new Map({
  target: 'map',
  controls: defaultControls().extend([new TimeControl({pit}), observationsControl]),
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
globalThis.map = map;
globalThis.view = view;
globalThis.source = sightingSource;
