import type { Extent } from 'ol/extent';
import { Temporal } from 'temporal-polyfill';
import { ImageTile, Vector as VectorSource } from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { ReadOptions } from 'ol/format/Feature';
import { bbox } from 'ol/loadingstrategy';
import type { PointInTime } from '../PointInTime';
import { Query } from '../Query';
import { TimeScale } from '../TimeScale';
import { LoaderOptions } from 'ol/source/DataTile';
import { detectHeading, ObservationProperties } from '../observation';

type ResultPage<T> = {
  total_results: number;
  page: number;
  per_page: number;
  results: [T];
}

type Observation = {
  id: number;
  description: string | null;
  geojson: {coordinates: [number, number], type: 'Point'};
  geoprivacy: string | null;
  public_positional_accuracy: number;
  taxon: {name: string; preferred_common_name: string | null};
  taxon_geoprivacy: string | null;
  time_observed_at: string; // provided one is guaranteed by the query
  uri: string;
}

type INaturalistProperties = ObservationProperties & {
  obscured: boolean;
  source: 'inaturalist';
  url: string;
}

class ObservationPage extends GeoJSON {
  protected readFeaturesFromObject(page: ResultPage<Observation>, options?: ReadOptions): Feature<Geometry>[] {
    const features = page.results.map(obs => {
      const observedAt = Temporal.Instant.from(obs.time_observed_at);
      const properties: INaturalistProperties = {
        body: obs.description,
        coordinates: obs.geojson.coordinates,
        count: null,
        heading: detectHeading(obs.description || ''),
        individuals: [],
        taxon: obs.taxon.name,
        obscured: obs.geoprivacy === 'obscured' || obs.taxon_geoprivacy === 'obscured',
        observedAt,
        source: 'inaturalist',
        url: obs.uri,
      };
      return {
        geometry: obs.geojson,
        id: obs.uri,
        properties,
        type: 'Feature',
      };
    });
    return super.readFeaturesFromObject({type: 'FeatureCollection', features}, options);
  }
}

export class Features extends VectorSource {
  baseURL = 'https://api.inaturalist.org/v2/observations';
  fieldspec = "(geojson:!t,geoprivacy:!t,public_positional_accuracy:!t,taxon:(name:!t,preferred_common_name:!t),taxon_geoprivacy:!t,time_observed_at:!t,uri:!t)";

  constructor({query, pit, timeScale}: {query: Query; pit: PointInTime, timeScale: TimeScale}) {
    const url = ([minx, miny, maxx, maxy]: Extent) => {
      const targetDate = pit.toPlainDate();
      const taxonId = query.taxon.id;
      if (!targetDate || !taxonId)
        return '';

      const earliest = targetDate.subtract(timeScale.value);
      const latest = targetDate.add(timeScale.value);

      const url = this.baseURL +
        `?taxon_id=${taxonId}&d1=${earliest}&d2=${latest}` +
        `&nelat=${maxy.toFixed(6)}&nelng=${maxx.toFixed(6)}&swlat=${miny.toFixed(6)}&swlng=${minx.toFixed(6)}` +
        '&geoprivacy=open&taxon_geoprivacy=open' +
        `&fields=${this.fieldspec}&per_page=200`;
      return url;
    }
    super({format: new ObservationPage(), strategy: bbox, url});

    pit.on('change', () => this.refresh());
    query.on('change', () => this.refresh());
    timeScale.on('change', () => this.refresh());
  }
}

export class Tiles extends ImageTile {
  constructor({query}: {query: Query}) {
    const url = (z: number, x: number, y: number, options: LoaderOptions) => {
      return queryStringAppend(`https://tiles.inaturalist.org/v2/grid/${z}/${x}/${y}.png`, {
        geoprivacy: 'open',
        acc_below: 500,
        tile_size: 256,
        taxon_id: query.taxon.id,
      });
    }
    super({projection: 'EPSG:3857', tileSize: [256, 256], url});
    query.on('change', () => this.changed());
  }
}


const speciesCountsEndpoint = 'https://api.inaturalist.org/v2/observations/species_counts';
const speciesCountsFieldspec = '(taxon:(id:!t,name:!t,parent_id:!t,preferred_common_name:!t,ancestors:(id:!t,name:!t,parent_id:!t,preferred_common_name:!t)))';

const queryStringAppend = (base: string, attrs: {[k: string]: string | string[] | number | number[]}) => {
  let queryString = Object.entries(attrs).map(([key, value]) => {
    value = Array.isArray(value) ? value.join(',') : value.toString();
    return `${key}=${value}`;
  }).join('&');
  return base + (base.indexOf('?') === -1 ? '?' : '&') + queryString;
}

export async function fetchSpeciesPresent(taxonID: number, placeID: number) {
  const url = queryStringAppend(speciesCountsEndpoint, {
    fields: speciesCountsFieldspec,
    include_ancestors: 'true',
    locale: 'en-US',
    place_id: placeID,
    preferred_place_id: 1,
    quality_grade: 'research',
    taxon_id: taxonID,
  });
  const resp = await fetch(url);
  const body: ResultPage<SpeciesCount> = await resp.json();
  const taxonByID: {[k: number]: Taxon} = {};
  for (const {taxon: {ancestors, ...taxon}} of body.results) {
    taxonByID[taxon.id] = taxon;
    for (const ancestor of ancestors) {
      taxonByID[ancestor.id] = ancestor;
    }
  }
  return taxonByID;
}

export type Taxon = {
  id: number;
  name: string; // scientific name
  parent_id: number;
  preferred_common_name: string; // en-US
} | {
  id: 48460;
  name: 'Life';
  parent_id: null;
  preferred_common_name: 'Life';
};

type SpeciesCount = {
  count: number;
  taxon: Taxon & {ancestors: Taxon[]};
};
