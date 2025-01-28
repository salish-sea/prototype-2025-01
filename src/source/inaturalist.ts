import type { Extent } from 'ol/extent';
import { Temporal } from 'temporal-polyfill';
import { Vector as VectorSource } from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { ReadOptions } from 'ol/format/Feature';
import { bbox } from 'ol/loadingstrategy';
import type { PointInTime } from '../PointInTime';
import { Query } from '../Query';
import { TimeScale } from '../TimeScale';

type ResultPage<T> = {
  total_results: number;
  page: number;
  per_page: number;
  results: [T];
}

type Observation = {
  id: number;
  geojson: {coordinates: [number, number], type: 'Point'};
  geoprivacy: string | null;
  public_positional_accuracy: number;
  taxon: {name: string; preferred_common_name: string | null};
  taxon_geoprivacy: string | null;
  time_observed_at: string | null;
  uri: string;
}

export type INaturalistProperties = {
  kind: string;
  obscured: boolean;
  observedAt: Temporal.Instant | null;
  source: 'inaturalist';
  url: string;
}

class ObservationPage extends GeoJSON {
  protected readFeaturesFromObject(page: ResultPage<Observation>, options?: ReadOptions): Feature<Geometry>[] {
    const features = page.results.map(obs => {
      let observedAt = null;
      if (obs.time_observed_at) {
        try {
          observedAt = Temporal.Instant.from(obs.time_observed_at);
        } catch (error) {
          console.error(`Failed to decode time_observed_at for iNaturalist observation ${obs.id}: ${error}`);
        }
      }
      const properties: INaturalistProperties = {
        kind: obs.taxon.preferred_common_name || obs.taxon.name,
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

export class INaturalistSource extends VectorSource {
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
