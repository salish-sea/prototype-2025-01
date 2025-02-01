import JSONFeature from "ol/format/JSONFeature";
import VectorSource from "ol/source/Vector";
import { Feature } from 'ol';
import { Geometry, Point } from 'ol/geom';
import { Temporal } from "temporal-polyfill";
import { all } from 'ol/loadingstrategy';
import {get as getProjection} from 'ol/proj';

type VesselLocation = {
  VesselID: number;
  VesselName: string;
  Latitude: number;
  Longitude: number;
  Heading: number;
  InService: boolean;
  AtDock: boolean;
  TimeStamp: string;
}

type VesselLocationResponse = VesselLocation[];

export type VesselLocationProperties = {
  kind: 'Ferry';
  name: string;
  observedAt: Temporal.Instant;
  source: 'WSF';
}

export class VesselLocations extends JSONFeature {
  protected readFeatureFromObject(object: VesselLocation, options?: import("ol/format/Feature").ReadOptions): Feature<Geometry> {
    const feature = new Feature();
    const timestamp = parseInt(object.TimeStamp.slice(6, 19), 10);
    const properties: VesselLocationProperties = {
      kind: 'Ferry',
      name: object.VesselName,
      observedAt: Temporal.Instant.fromEpochMilliseconds(timestamp),
      source: 'WSF',
    };
    feature.setProperties(properties);
    feature.setGeometry(new Point([object.Longitude, object.Latitude]));
    feature.setId(`wsf:${object.VesselName}`);
    return feature;
  }

  protected readFeaturesFromObject(object: VesselLocationResponse, options?: import("ol/format/Feature").ReadOptions): Feature<Geometry>[] {
    return object.
      filter(location => location.InService && !location.AtDock).
      map(location => this.readFeatureFromObject(location, options));
  }

  protected readProjectionFromObject(object: any): import("ol/proj/Projection").default {
    return getProjection('EPSG:4326')!;
  }
}

export class Ferries extends VectorSource {
  constructor(accessCode: string) {
    // const url = `https://wsdot.wa.gov/ferries/api/vessels/rest/vessellocations?apiaccesscode=${accessCode}`;
    const url = './ferries.json';
    super({format: new VesselLocations(), strategy: all, url});
  }
}
