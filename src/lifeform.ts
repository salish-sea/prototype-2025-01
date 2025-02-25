import biggs from './biggs.json';
import srkw from './srkw.json';
const ecotypes = ['Biggs', 'SRKW', 'NRKW'] as const;
const pods = ['J', 'K', 'L', 'T'] as const;
export type Pod = typeof pods[number];
const orca = ['Orcinus orca', 'Orcinus orca ater', 'Orcinus orca rectipinnus'] as const;
export type IndividualOrca = `${typeof pods[number]}${number}` | `${typeof pods[number]}${number}${string}`;
export type Matriline = `${IndividualOrca}s`;
type Orca = typeof orca[number] | typeof ecotypes[number] | Pod | IndividualOrca | Matriline;

window.biggs = biggs;

const normalizeIndividual = (name: string) => {
  return name.replace(/^(J|K|L|T|CRC)0+/, '$1');
}
const individuals = biggs.
  map(whale => normalizeIndividual(whale.identifier)).
  concat(srkw.map(whale => normalizeIndividual(whale.identifier)));

const cetacea = 'Cetacea';
const phocoenidae = ['Phocoenidae', 'Phocoena phocoena', 'Phocoenoides dalli', 'Delphinus delphis', 'Lissodelphis borealis'];
const mysticeti = ['Mysticeti', 'Balaenoptera brydei', 'Balaenoptera acutorostrata', 'Balaenoptera physalus', 'Phocoenoides dalli', 'Megaptera novaeangliae', 'Eschrichtius robustus'];
const phocidae = ['Phocidae', 'Phoca vitulina', 'Mirounga angustirostris'];

export type Lifeform = typeof cetacea | typeof phocoenidae[number] | typeof mysticeti[number] | typeof phocidae[number] | Orca;

function assertPod(name: string): asserts name is Pod {
  if (name.match(/^([JKLT]|CRC)$/))
    return;
  throw `${name} is not a pod`;
}

function isIndividualOrca(name: string): name is IndividualOrca {
  if (individuals.indexOf(name) !== -1)
    return true;
  if (name.startsWith('CRC'))
    return true;
  console.warn(`${name} is not an individual Orca`);
  return false;
}

const ecotypeRE = /\b(srkw|southern resident|transient|biggs)\b/gi;
export const detectEcotype = (text: Readonly<string>) => {
  for (const [, ecotype] of text.matchAll(ecotypeRE)) {
    switch (ecotype.toLowerCase()) {
      case 'biggs': return 'Biggs';
      case 'southern resident': return 'SRKW';
      case 'srkw': return 'SRKW';
      case 'transient': return 'Biggs';
    }
  }
  return null;
}

const podCleanerRE = /\s*(\+|,|&|and|-)\\s*/gi;
const podRE = /\b([jklt]+)\s?pod\b/gi;
export const detectPod = (text: Readonly<string>) => {
  for (const [, pods] of text.replaceAll(podCleanerRE, '').matchAll(podRE)) {
    for (const pod of [...pods]) {
      assertPod(pod);
      return pod.toUpperCase();
    }
  }
  if (detectEcotype(text) === 'Biggs')
    return 'T';
  return null;
}

// return an array of identifiers like 'Biggs', 'Transient', 'J', 'K37', etc.
const individualRE = /\b(t|j|k|l|t|crc)-?([0-9][0-9a-f]+)(s?)\b/gi;
export const detectIndividuals = (text: Readonly<string>) => {
  const matches = new Set<Lifeform>();
  for (let [, pod, individual, matriline] of text.matchAll(individualRE)) {
    pod = pod.toUpperCase();
    const id = normalizeIndividual(`${pod}${individual.toUpperCase()}`);
    if (matriline) {
      matches.add(`${id}s` as Matriline);
    } else if (isIndividualOrca(id)) {
      matches.add(id);
    }
  }
  return [...matches].sort();
}
