import { Temporal } from "temporal-polyfill";
import { INaturalistProperties } from "./source/inaturalist";
import { MaplifyProperties } from "./source/maplify";
import { VesselLocationProperties } from "./source/wsf";

type DatasourceProperties = INaturalistProperties | MaplifyProperties | VesselLocationProperties;
type RequiredProperties = {
  body: string | null;
  count: number;
  kind: string;
  observedAt: Temporal.Instant | null;
  source: string;
};
export type ObservationProperties = DatasourceProperties & RequiredProperties;

export function observationId(source: string, id: string | number) {
  return `${source}:${id}`;
}
