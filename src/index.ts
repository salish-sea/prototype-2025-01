import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import { useGeographic } from 'ol/proj';
import {Point} from 'ol/geom.js';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';
import VectorSource from 'ol/source/Vector';
import sightings from './sightings.json';
import { Feature, Observable } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import { XYZ } from 'ol/source';
import {Control, defaults as defaultControls} from 'ol/control.js';
import Link from 'ol/interaction/Link.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults';
import { Temporal } from 'temporal-polyfill';

useGeographic();

// https://www.inaturalist.org/observations/258050998
let location = [-122.450, 47.8];

class PointInTime extends Observable {
  value: Temporal.ZonedDateTime | null = null;

  // format is YYYY-MM-DDTHH:mm, timezone is PST8PDT
  set(value: string | null) {
    if (!value) {
      console.log('clearing pit value');
      this.value = null;
    } else {
      try {
        console.log('setting pit value');
        this.value = Temporal.PlainDateTime.from(value).toZonedDateTime('PST8PDT');
      } catch (error) {
        console.log(`error setting pit value: ${error}`);
        this.value = null;
      }
    }
    link.update('t', this.toNaiveISO());
    sightingSource?.changed();
  }

  toNaiveISO(): string | null {
    return this.value?.toString({offset: 'never', smallestUnit: 'minute', timeZoneName: 'never'}) || null;
  }
}

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
}

const view = new View({
  center: location,
  zoom: 11,
});

const sightingSource = new VectorSource({
  features: sightings.map(sighting => new Feature({
    geometry: new Point([sighting.longitude, sighting.latitude]),
    created: (Temporal.Instant.from(sighting.created.replace(' ', 'T') + 'Z')),
  })),
});

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(value, high));
}

const sightingLayer = new VectorLayer({
  source: sightingSource,
  style: (feature, resolution) => {
    const created: Temporal.Instant = feature.get('created');
    const timeDelta = pit.value?.toInstant().until(created) || new Temporal.Duration();
    const deltaScale = Math.abs(clamp(timeDelta.total('days') / 2, -1, 1));
    const hue = timeDelta.sign < 0 ? 20 : 200;
    const fill = new Fill({color: `hsl(${hue} 50% 50% / ${1 - deltaScale})`});
    const stroke = new Stroke({color: `hsl(${hue} 50% 50% / 1.0)`});
    return new Style({
      image: new Circle({fill, radius: 5}),
    });
  },
});

const pit = new PointInTime();
const setTime = pit.set.bind(pit);
const link = new Link({replace: true});
setTime(link.track('t', newValue => {
  console.log('link t param changed');
  setTime(newValue);
}));

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
    sightingLayer,
  ],
  view,
});
globalThis.map = map;
globalThis.view = view;
