import taxa from './taxa.json';

// handle is inaturalist taxon id as a string, or 'SRKW'
// name is scientific name, or 'SRKW'

export const taxonByID = taxa;
export const taxonByName = Object.fromEntries(Object.values(taxa).map(taxon => [taxon.name.toLowerCase(), taxon]));
export const taxonByCommonName = Object.fromEntries(Object.values(taxa).map(taxon => [taxon.preferred_common_name.toLowerCase().replace(' whale', ''), taxon]));
export type TaxonHandle = keyof typeof taxa;
export type Taxon = typeof taxa['41521'];
export const taxonAndDescendants = (taxon: Taxon): Taxon[] => {
  return [taxon, ...findChildren(taxon).flatMap(taxonAndDescendants)];
};
const findChildren = ({id}: {id: number}): Taxon[] => {
  return Object.values(taxa).filter(taxon => taxon.parent_id === id);
}

export const normalizeTaxon = (name: string) => {
  const lowerName = name.toLowerCase().replace(' whale', '');
  let taxon = taxonByName[lowerName];
  if (!taxon && lowerName.indexOf('orca') !== -1)
    taxon = taxonByName['orcinus orca'];

  if (!taxon)
    taxon = taxonByCommonName[lowerName];

  if (!taxon) {
    console.error(`Unknown taxon ${name}.`);
    return name;
  }

  return taxon.name;
}
