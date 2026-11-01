export const FOOD_GROUPS = ['meat', 'dairy', 'vegetables', 'fruits', 'grains'] as const;
export type FoodGroup = (typeof FOOD_GROUPS)[number];
const allowed = new Set<string>(FOOD_GROUPS);
export function isFoodGroup(value: unknown): value is FoodGroup {
  return typeof value === 'string' && allowed.has(value);
}
export function requireFoodGroup(value: unknown): FoodGroup {
  if (!isFoodGroup(value)) throw new Error('Unsupported food group');
  return value;
}
export type CatalogCandidate = { name: unknown; group: unknown; unitPriceMinor: unknown; currency: unknown };
export function validateCatalogCandidate(input: CatalogCandidate) {
  const group = requireFoodGroup(input.group);
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 200) throw new Error('Invalid product name');
  if (!Number.isSafeInteger(input.unitPriceMinor) || (input.unitPriceMinor as number) < 0) throw new Error('Invalid price');
  if (input.currency !== 'CAD' && input.currency !== 'USD') throw new Error('Unsupported currency');
  return { name: input.name.trim(), group, unitPriceMinor: input.unitPriceMinor as number, currency: input.currency };
}
