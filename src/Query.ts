import { Observable } from "ol";
import { Taxon, taxonByName } from "./Taxon";

export class Query extends Observable {
  taxon: Taxon;
  value: Readonly<string>;

  constructor(query: string) {
    super();
    this.set(query);
  }

  set(query: string) {
    query = query.trim();
    if (this.value === query)
      return;

    this.value = query;
    this.taxon = taxonByName[query.toLowerCase()];
    this.changed();
  }
}
