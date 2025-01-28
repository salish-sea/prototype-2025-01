import { Control } from "ol/control";
import { Query } from "../Query";
import { taxonByName } from "../Taxon";

const options = [
  'Cetacea',
  'Eschrichtius robustus',
  'Megaptera novaeangliae',
  'Orcinus orca',
  'SRKW'
].map(name => [name, taxonByName[name].preferred_common_name]);

export default class TaxonControl extends Control {
  constructor({query}: {query: Query}) {
    const currentQuery = query.value;

    const container = document.createElement('div');
    container.className = 'taxon-control ol-unselectable ol-control';

    const input = document.createElement('select');
    container.appendChild(input);

    for (const [value, name] of options) {
      const option = document.createElement('option');
      option.value = value;
      option.innerText = name;
      option.selected = value === currentQuery;
      input.appendChild(option);
    }

    super({element: container})

    input.addEventListener('change', e => {
      console.log('taxon control changed');
      const target = e.target as HTMLSelectElement;
      query.set(target.value);
    }, {passive: true});
  }
}
