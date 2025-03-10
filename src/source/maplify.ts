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
import { detectHeading, observationId, ObservationProperties } from '../observation';
import { Query } from '../Query';
import { normalizeTaxon, taxonAndDescendants } from '../Taxon';
import { TimeScale } from '../TimeScale';
import { detectEcotype, detectIndividuals, detectPod } from '../lifeform';

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

type MaplifyProperties = ObservationProperties & {
  source: Source;
}

class MaplifyFormat extends JSONFeature {
  query: Query

  constructor({query}: {query: Query}) {
    super();
    this.query = query;
  }

  protected readFeatureFromObject(object: Result, options?: import("ol/format/Feature").ReadOptions): Feature<Geometry> | Feature<Geometry>[] {
    let taxon = normalizeTaxon(object.name);
    const ecotype = detectEcotype(object.comments);
    if (ecotype === 'Biggs') {
      taxon = 'Orcinus orca rectipinnus';
    } else if (ecotype === 'SRKW') {
      taxon = 'Orcinus orca ater';
    }
    const feature = new Feature();
    const properties: MaplifyProperties = {
      body: object.comments,
      coordinates: [object.longitude, object.latitude],
      count: object.number_sighted,
      ecotype,
      heading: detectHeading(object.comments),
      pod: detectPod(object.comments),
      photos: object.photo_url ? [object.photo_url] : [],
      individuals: detectIndividuals(object.comments),
      observedAt: Temporal.PlainDateTime.from(object.created).toZonedDateTime('GMT').toInstant(),
      source: object.source,
      taxon,
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

  constructor({query, pit, timeScale}: {query: Query; pit: PointInTime; timeScale: TimeScale}) {
    const url = ([minx, miny, maxx, maxy]: Extent) => {
      const targetDate = pit.toPlainDate();
      if (!targetDate)
        return '';
      const earliest = targetDate.subtract(timeScale.value);
      const latest = targetDate.add(timeScale.value);

      minx = Math.max(minx, -180);
      miny = Math.max(miny, -90);
      maxx = Math.min(maxx, 180);
      maxy = Math.min(maxy, 90);

      return 'https://maplify.com/waseak/php/search-all-sightings.php' +
        `?start=${earliest}&end=${latest}` +
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
    timeScale.on('change', () => this.refresh());
  }
}
