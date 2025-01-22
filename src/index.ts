import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import { useGeographic } from 'ol/proj';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';
import VectorLayer from 'ol/layer/Vector';
import { Source, XYZ } from 'ol/source';
import {Control, defaults as defaultControls} from 'ol/control.js';
import Link from 'ol/interaction/Link.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults';
import { Temporal } from 'temporal-polyfill';
import { INaturalistSource } from './source/inaturalist';
import { MaplifySource } from './source/maplify';
import { PointInTime } from './PointInTime';

useGeographic();

// wsdot key dd816e21-7394-414b-8f6d-57751494b0b1

// https://www.inaturalist.org/observations/258050998
let location = [-122.450, 47.8];

const pit = new PointInTime();

class TimeControl extends Control {
  constructor(options: object = {}) {
    const container = document.createElement('div');
    container.className = 'time-control ol-unselectable ol-control';
    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.value = pit.toNaiveISO() || '';
    input.min = '1900-01-01T00:00';
    input.max = (new Date()).toISOString().slice(0, 16);
    container.appendChild(input);

    super({...options, element: container})

    input.addEventListener('change', e => {
      console.log('time control changed');
      const target = e.target as HTMLInputElement;
      setTime(target.value);
    }, {passive: true});
  }
}

declare global {
  var map: Map;
  var view: View;
  var source: Source;
}

const view = new View({
  center: location,
  zoom: 11,
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
    const created: Temporal.Instant = feature.get('created');
    const delta = pit.value?.until(created) || new Temporal.Duration();
    const absDeltaHours = Math.abs(delta.total('hours'));
    const hue = delta.sign < 0 ? 100 : 280;
    if (absDeltaHours < 1) {
      return markerStyle({hue, opacity: 1 - absDeltaHours / 2});
    } else {
      return markerStyle({hue, opacity: Math.max(0.15, 0.5 - absDeltaHours / 6)});
    }
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

const map = new Map({
  target: 'map',
  controls: defaultControls().extend([new TimeControl()]),
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
  for (const feature of features) {
    const url: string | undefined = feature.getProperties().url;
    if (url)
      window.open(url, 'observation');
  }
});
globalThis.map = map;
globalThis.view = view;
globalThis.source = sightingSource;
