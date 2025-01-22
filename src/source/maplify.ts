import type { Extent } from 'ol/extent';
import { Temporal } from 'temporal-polyfill';
import { Vector as VectorSource } from 'ol/source';
import JSONFeature from 'ol/format/JSONFeature';
import { Feature } from 'ol';
import { Geometry, Point } from 'ol/geom';
import type { Projection } from 'ol/proj';
import type { PointInTime } from '../PointInTime';
import { bbox } from 'ol/loadingstrategy';
import {get as getProjection} from 'ol/proj';

type Result = {
  type: string;
  id: number;
  project_id: number;
  trip_id: number;
  name: string;
  scientific_name: string;
  latitude: number;
  longitude: number;
  number_sighted: number;
  created: string; // e.g. "2025-01-21 17:50:00"
  photo_url: string;
  comments: string;
  in_ocean: number;
  count_check: number;
  moderated: number;
  trusted: number;
  is_test: number;
  source: string;
  usernm: string;
  icon: string;
}

type APIResponse = {
  count: string; // !!
  results: Result[];
}

class MaplifyFormat extends JSONFeature {
  protected readFeatureFromObject(object: Result, options?: import("ol/format/Feature").ReadOptions): Feature<Geometry> | Feature<Geometry>[] {
    const feature = new Feature();
    feature.setProperties({
      created: Temporal.PlainDateTime.from(object.created).toZonedDateTime('GMT').toInstant(),
      name: object.name,
    });
    feature.setGeometry(new Point([object.longitude, object.latitude]));
    feature.setId(`${object.source}:${object.id}`);
    return feature;
  }

  protected readFeaturesFromObject(object: APIResponse, options?: import("ol/format/Feature").ReadOptions): Feature<Geometry>[] {
    return object.results.map(result => this.readFeatureFromObject(result, options)).flat();
  }

  protected readProjectionFromObject(object: any): import("ol/proj/Projection").default {
    return getProjection('EPSG:4326')!;
  }
}

export class MaplifySource extends VectorSource {
  pit: PointInTime;

  constructor({pit}: {pit: PointInTime}) {
    const url = ([minx, miny, maxx, maxy]: Extent) => {
      if (!pit.earliest || !pit.latest)
        return '';

      return 'https://maplify.com/waseak/php/search-all-sightings.php' +
        `?BBOX=${minx.toFixed(6)},${miny.toFixed(6)},${maxx.toFixed(6)},${maxy.toFixed(6)}` +
        `&start=${pit.earliest}&end=${pit.latest}`;
    };
    const format = new MaplifyFormat();
    const loader = (extent: Extent, resolution: number, projection: Projection, success: any, failure: any) => {
      const endpoint = url(extent);
      if (!endpoint)
        return success([]);
      fetch(endpoint)
        .then(resp => resp.json())
        .then(json => format.readFeatures(json, {extent, featureProjection: projection}))
        .then(features => {
          this.addFeatures(features);
          success && success();
        })
        .catch(() => failure && failure());
    };
    super({format, loader, strategy: bbox, url});
    this.pit = pit;
    pit.on('change', () => this.changed());
  }
}
