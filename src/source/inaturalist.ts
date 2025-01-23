import type { Extent } from 'ol/extent';
import { Temporal } from 'temporal-polyfill';
import { Vector as VectorSource } from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { ReadOptions } from 'ol/format/Feature';
import { bbox } from 'ol/loadingstrategy';
import type { PointInTime } from '../PointInTime';

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
  taxon: {common_name: string | null; scientific_name: string};
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
        kind: obs.taxon.common_name || obs.taxon.scientific_name,
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
  fieldspec = "(geojson:!t,geoprivacy:!t,public_positional_accuracy:!t,taxon:(name:!t),taxon_geoprivacy:!t,time_observed_at:!t,uri:!t)";
  taxonId: number;

  constructor({taxon, pit}: {taxon: number; pit: PointInTime}) {
    const url = ([minx, miny, maxx, maxy]: Extent) => {
      const earliest = pit.earliest?.toString();
      const latest = pit.latest?.toString();
      if (!earliest || !latest)
        return '';

      const url = this.baseURL +
        `?taxon_id=${this.taxonId}&d1=${earliest}&d2=${latest}` +
        `&nelat=${maxy.toFixed(6)}&nelng=${maxx.toFixed(6)}&swlat=${miny.toFixed(6)}&swlng=${minx.toFixed(6)}` +
        '&geoprivacy=open&taxon_geoprivacy=open' +
        `&fields=${this.fieldspec}&per_page=200`;
      return url;
    }
    super({format: new ObservationPage(), strategy: bbox, url});

    this.taxonId = taxon;
    pit.on('change', () => this.refresh());
  }
}
