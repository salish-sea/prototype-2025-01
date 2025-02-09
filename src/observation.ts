import { Temporal } from "temporal-polyfill";
import { INaturalistProperties } from "./source/inaturalist";
import { MaplifyProperties } from "./source/maplify";
import { VesselLocationProperties } from "./source/wsf";
import { Lifeform } from "./lifeform";

type DatasourceProperties = INaturalistProperties | MaplifyProperties | VesselLocationProperties;
type RequiredProperties = {
  body: string;
  count: number;
  kind: string;
  lifeforms: Lifeform[];
  observedAt: Temporal.Instant | null;
  source: string;
};
export type ObservationProperties = DatasourceProperties & RequiredProperties;

export function observationId(source: string, id: string | number) {
  return `${source}:${id}`;
}
