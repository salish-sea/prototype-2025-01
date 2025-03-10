import { Temporal } from "temporal-polyfill";
import { Lifeform } from "./lifeform";

export type ObservationProperties = {
  body: string | null;
  coordinates: [number, number];
  count: number | null;
  ecotype: string | null;
  heading: Heading | null;
  photos: string[];
  individuals: Lifeform[];
  observedAt: Temporal.Instant;
  pod: string | null;
  source: string;
  taxon: string;
  url: string | null;
};

export function observationId(source: string, id: string | number) {
  return `${source}:${id}`;
}

export type Heading = 'north' | 'northwest' | 'west' | 'southwest' | 'south' | 'southeast' | 'east' | 'northeast';
const headingRE = /\b(north|northwest|west|southwest|south|southeast|east|northeast)(bound)?\b/gi;
export const detectHeading: (text: string) => Heading | null = (text: string) => {
  for (const [, heading] of text.matchAll(headingRE)) {
    return heading as Heading;
  }
  return null;
}
declare global {
  var detectHeading: any
}
window.detectHeading = detectHeading;
