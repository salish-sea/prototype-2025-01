import { Control } from "ol/control";
import { taxonByName } from "../Taxon";
import { ObservationProperties } from "../observation";
import Collection from "ol/Collection";
import Feature from "ol/Feature";
import { Geometry } from "ol/geom";
import { Query } from "../Query";

type Kind = string | [string, Kind[]];

type Hierarchy = Kind[];

const hierarchy: Hierarchy = [
  ['Otariidae', ['Zalophus californianus', 'Eumetopias jubatus', 'Callorhinus ursinus', 'Arctocephalus townsendi']],
  ['Cetacea', [
    ['Mysticeti', ['Eschrichtius robustus', 'Megaptera novaeangliae']],
    ['Odontoceti', [
      'Orcinus orca',
      'Phocoena phocoena',
      'Delphinapterus leucas',
      'Ziphius cavirostris',
      'Physeter macrocephalus',
    ]],
  ]],
];

const makeList = (kind: Kind, observations: Feature<Geometry>[]) => {
  const taxonName = typeof kind === 'string' ? kind : kind[0];
  const taxon = taxonByName[taxonName.toLowerCase()];

  const li = document.createElement('li');
  li.classList.add('kind');
  li.innerText = taxon.preferred_common_name || taxon.name;

  const filteredObservations = observations.filter(obs => obs.get('taxon') === kind);
  if (filteredObservations.length > 0)
    li.innerText += ` (${filteredObservations.length})`;

  if (Array.isArray(kind)) {
    const children = kind[1];
    const ul = document.createElement('ul');
    ul.classList.add('kind-children');
    for (const child of children.map(c => makeList(c, observations))) {
      ul.appendChild(child);
    }
    li.appendChild(ul);
  }

  return li;
}

export class TaxonView extends Control {
  constructor({observations, query}: {observations: Collection<Feature<Geometry>>, query: Query}) {
    const container = document.createElement('div');
    container.className = 'taxon-view ol-control';

    const ul = document.createElement('ul');
    ul.classList.add('kind-hierarchy');

    const populate = () => {
      const children = hierarchy.flatMap(k => makeList(k, observations.getArray()));
      ul.innerHTML = '';
      for (const child of children) {
        ul.appendChild(child);
      }
    }

    container.appendChild(ul);

    super({element: container});

    observations.on('change', populate);
    populate();
  }
}
