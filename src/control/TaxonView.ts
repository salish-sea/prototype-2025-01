import { Control } from "ol/control";
import { Taxon, taxonAndDescendants, taxonByName } from "../Taxon";
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
      ['Orcinus orca', ['Orcinus orca ater', 'Orcinus orca rectipinnus']],
      'Phocoena phocoena',
      'Delphinapterus leucas',
    ]],
  ]],
];

const makeList = (kind: Kind, observations: Feature<Geometry>[], query: Query) => {
  const taxonName = typeof kind === 'string' ? kind : kind[0];
  const taxon = taxonByName[taxonName.toLowerCase()];

  const li = document.createElement('li');
  li.classList.add('kind');
  const span = document.createElement('span');
  li.appendChild(span);

  const link = document.createElement('a');
  link.classList.add('select-taxon');
  link.dataset.taxon = taxon.name;
  link.href = '#';
  link.innerText = taxon.preferred_common_name || taxon.name;
  span.appendChild(link);

  let obsCount = observations.filter(obs => obs.get('taxon') === taxonName).length;

  if (Array.isArray(kind)) {
    const children = kind[1];
    const ul = document.createElement('ul');
    ul.classList.add('kind-children');
    for (const [child, subObsCount] of children.map(c => makeList(c, observations, query))) {
      obsCount += subObsCount;
      ul.appendChild(child);
    }
    li.appendChild(ul);
  }

  if (obsCount > 0)
    span.appendChild(document.createTextNode(` (${obsCount})`));

  return [li, obsCount] as const;
}

export class TaxonView extends Control {
  constructor({observations, query, selection}: {observations: Collection<Feature<Geometry>>, query: Query, selection: Collection<Feature<Geometry>>}) {
    const container = document.createElement('div');
    container.className = 'taxon-view ol-control';

    const ul = document.createElement('ul');
    ul.classList.add('kind-hierarchy');

    const populate = () => {
      const children = hierarchy.flatMap(k => makeList(k, observations.getArray(), query)[0]);
      ul.innerHTML = '';
      for (const child of children) {
        ul.appendChild(child);
      }
    }

    const focus = (taxon: Taxon) => {
      const taxonNames = taxonAndDescendants(taxon).map(t => t.name);
      const toSelect = observations.getArray().filter(obs => taxonNames.indexOf(obs.get('taxon')) !== -1);
      selection.clear();
      selection.extend(toSelect);
      selection.changed();
    };

    ul.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const taxonName = target.dataset.taxon;

      if (taxonName && target.matches('.select-taxon')) {
        e.preventDefault();
        const taxon = taxonByName[taxonName.toLowerCase()]!;
        focus(taxon);
      }
    })

    container.appendChild(ul);

    super({element: container});

    observations.on('change', populate);
    populate();
  }
}
