import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import { useGeographic } from 'ol/proj';
import {Point} from 'ol/geom.js';
import {Circle, Fill, Stroke, Style} from 'ol/style.js';
import VectorSource from 'ol/source/Vector';
import sightings from './sightings.json';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import { XYZ } from 'ol/source';
import colormap from 'colormap';

useGeographic();

// https://www.inaturalist.org/observations/258050998
const location = [-123.450, 48.126];
const time = new Date('2024-12-30T18:00:00Z');
const dayDuration = 86400000;

declare global {
  var map: Map;
  var view: View;
}

const view = new View({
  center: [-123.450, 48.126],
  zoom: 9,
});

const sightingSource = new VectorSource({
  features: sightings.map(sighting => new Feature({
    geometry: new Point([sighting.longitude, sighting.latitude]),
    timeDelta: (new Date(sighting.created.replace(' ', 'T') + 'Z')).valueOf() - time.valueOf(),
  })),
});

const ramp = colormap({colormap: 'blackbody', nshades: 48});

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(value, high));
}

const sightingLayer = new VectorLayer({
  source: sightingSource,
  style: (feature, resolution) => {
    const timeDelta: number = feature.get('timeDelta');
    const deltaScale = clamp(timeDelta / (dayDuration * 2), -1, 1);
    const hue = timeDelta < 0 ? 20 : 200;
    const saturation = (Math.abs(deltaScale) * 100).toFixed();
    const color = `hsl(${hue} ${saturation}% 50%)`;
    const fill = new Fill({color});
    const stroke = new Stroke({color: 'white'});
    return new Style({
      image: new Circle({fill, stroke, radius: 5}),
      fill: new Fill({color: 'red'}),
      stroke: new Stroke({color: 'white'}),
    });
  },
});

const map = new Map({
  target: 'map',
  // interactions: [new Link()],
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
