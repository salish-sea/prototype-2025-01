import { Temporal } from "temporal-polyfill";
import { INaturalistProperties } from "./source/inaturalist";
import { MaplifyProperties } from "./source/maplify";

type DatasourceProperties = INaturalistProperties | MaplifyProperties;
type RequiredProperties = {
  kind: string;
  observedAt: Temporal.Instant | null;
  source: string;
};
export type ObservationProperties = DatasourceProperties & RequiredProperties;

export function observationId(source: string, id: string | number) {
  return `${source}:${id}`;
}
