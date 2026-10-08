/** Fabric colours for the storefront's colour filter, in the backend's FabricColor enum order.
 *  The API sends a variant's colours as one string, "Red, Blue" ("None" = none).
 *  Labels: i18n `fabricColors.<value>`; `swatch` is the circle shown next to each one. */
export const FABRIC_COLORS = [
  { value: 'Red', swatch: '#d62828' },
  { value: 'Orange', swatch: '#f77f00' },
  { value: 'Yellow', swatch: '#f6c90e' },
  { value: 'Green', swatch: '#2f9e44' },
  { value: 'Blue', swatch: '#1c64c4' },
  { value: 'Purple', swatch: '#9c6ade' },
  { value: 'Pink', swatch: '#f28fb6' },
  { value: 'Brown', swatch: '#8a5a35' },
  { value: 'Beige', swatch: '#e6d5b8' },
  { value: 'White', swatch: '#ffffff' },
  { value: 'Grey', swatch: '#9aa0a6' },
  { value: 'Black', swatch: '#1b1b1b' },
  { value: 'Gold', swatch: 'linear-gradient(135deg, #b8860b, #f5d76e 50%, #b8860b)' },
  { value: 'Silver', swatch: 'linear-gradient(135deg, #8e8e8e, #e8e8e8 50%, #8e8e8e)' },
] as const;

export type FabricColor = typeof FABRIC_COLORS[number]['value'];

/** "Red, Blue" → ['Red', 'Blue'] (unknown names and "None" dropped). */
export const parseFabricColors = (raw: string | null | undefined): FabricColor[] => {
  const names = (raw ?? '').split(',').map(s => s.trim());
  return FABRIC_COLORS.map(c => c.value).filter(v => names.includes(v));
};

/** ['Red', 'Blue'] → "Red, Blue"; none → "None". */
export const formatFabricColors = (colors: readonly string[]): string =>
  colors.length ? FABRIC_COLORS.map(c => c.value).filter(v => colors.includes(v)).join(', ') : 'None';
