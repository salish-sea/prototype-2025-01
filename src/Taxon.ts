import cetacea from './cetacea.json';

// handle is inaturalist taxon id as a string, or 'SRKW'
// name is scientific name, or 'SRKW'

export const taxonByID = cetacea;
export const taxonByName = Object.fromEntries(Object.values(cetacea).map(taxon => [taxon.name, taxon]));
export type TaxonHandle = keyof typeof cetacea;
export type Taxon = typeof cetacea['41521'];
export const taxonAndDescendants = (taxon: Taxon): Taxon[] => {
  return [taxon, ...findChildren(taxon).flatMap(taxonAndDescendants)];
};
const findChildren = ({id}: {id: number}): Taxon[] => {
  return Object.values(cetacea).filter(taxon => taxon.parent_id === id);
}
