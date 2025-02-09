const ecotypes = ['Biggs', 'SRKW', 'NRKW'] as const;
const pods = ['J', 'K', 'L', 'T'] as const;
export type Pod = typeof pods[number];
const orca = ['Orcinus orca', 'Orcinus orca ater', 'Orcinus orca rectipinnus'] as const;
export type IndividualOrca = `${typeof pods[number]}${number}` | `${typeof pods[number]}${number}${string}`;
export type Matriline = `${IndividualOrca}s`;
type Orca = typeof orca[number] | typeof ecotypes[number] | Pod | IndividualOrca | Matriline;

const cetacea = 'Cetacea';
const phocoenidae = ['Phocoenidae', 'Phocoena phocoena', 'Phocoenoides dalli', 'Delphinus delphis', 'Lissodelphis borealis'];
const mysticeti = ['Mysticeti', 'Balaenoptera brydei', 'Balaenoptera acutorostrata', 'Balaenoptera physalus', 'Phocoenoides dalli', 'Megaptera novaeangliae', 'Eschrichtius robustus'];
const phocidae = ['Phocidae', 'Phoca vitulina', 'Mirounga angustirostris'];

export type Lifeform = typeof cetacea | typeof phocoenidae | typeof mysticeti | typeof phocidae | Orca;

export function assertIndividualOrca(name: string): asserts name is IndividualOrca {
  if (name.match(/^[JKLT]\d+/i))
    return;
  throw `${name} is not an individual Orca`;
}
