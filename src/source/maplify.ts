import type { Extent } from 'ol/extent';
import { Temporal } from 'temporal-polyfill';
import { Vector as VectorSource } from 'ol/source';
import JSONFeature from 'ol/format/JSONFeature';
import { Feature } from 'ol';
import { Geometry, Point } from 'ol/geom';
import type { Projection } from 'ol/proj';
import type { PointInTime } from '../PointInTime';
import { all } from 'ol/loadingstrategy';
import {get as getProjection} from 'ol/proj';
import { observationId } from '../observation';
import { Query } from '../Query';
import { taxonAndDescendants } from '../Taxon';

type Source = 'CINMS' | 'ocean_alert' | 'rwsas' | 'FARPB' | 'whale_alert';

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
  source: Source;
  usernm: string;
  icon: string;
}

type APIResponse = {
  count: string; // !!
  results: Result[];
}

export type MaplifyProperties = {
  kind: string;
  observedAt: Temporal.Instant;
  source: Source;
  url: string | null;
}

class MaplifyFormat extends JSONFeature {
  query: Query

  constructor({query}: {query: Query}) {
    super();
    this.query = query;
  }

  protected readFeatureFromObject(object: Result, options?: import("ol/format/Feature").ReadOptions): Feature<Geometry> | Feature<Geometry>[] {
    const feature = new Feature();
    const properties: MaplifyProperties = {
      kind: object.name,
      observedAt: Temporal.PlainDateTime.from(object.created).toZonedDateTime('GMT').toInstant(),
      source: object.source,
      url: null,
    };
    feature.setProperties(properties);
    feature.setGeometry(new Point([object.longitude, object.latitude]));
    feature.setId(observationId(object.source, object.id));
    return feature;
  }

  protected readFeaturesFromObject(object: APIResponse, options?: import("ol/format/Feature").ReadOptions): Feature<Geometry>[] {
    const targetTaxa = new Set(taxonAndDescendants(this.query.taxon).map(taxon => taxon.name));
    return object.results.
      filter(result => targetTaxa.has(result.scientific_name)).
      map(result => this.readFeatureFromObject(result, options)).
      flat();
  }

  protected readProjectionFromObject(object: any): import("ol/proj/Projection").default {
    return getProjection('EPSG:4326')!;
  }
}

export class MaplifySource extends VectorSource {
  pit: PointInTime;

  constructor({query, pit}: {query: Query; pit: PointInTime}) {
    const url = ([minx, miny, maxx, maxy]: Extent) => {
      if (!pit.earliest || !pit.latest)
        return '';

      minx = Math.max(minx, -180);
      miny = Math.max(miny, -90);
      maxx = Math.min(maxx, 180);
      maxy = Math.min(maxy, 90);

      return 'https://maplify.com/waseak/php/search-all-sightings.php' +
        `?start=${pit.earliest}&end=${pit.latest}` +
        `&BBOX=${minx.toFixed(3)},${miny.toFixed(3)},${maxx.toFixed(3)},${maxy.toFixed(3)}`;
    };
    const format = new MaplifyFormat({query});
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
    super({format, loader, strategy: all, url});
    this.pit = pit;
    pit.on('change', () => this.refresh());
    query.on('change', () => this.refresh());
  }
}
