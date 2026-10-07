/** Variant designs for the "Diseño" filter, in the order the backend's FabricPattern enum lists
 *  them (and the API's facets come in). Labels: i18n `fabricPatterns.<value>`. */
export const FABRIC_PATTERNS = ['Plain', 'Printed', 'Stripes', 'Checks', 'Dots'] as const;

export type FabricPattern = typeof FABRIC_PATTERNS[number];

/** A URL param as a design, or undefined when it isn't one (old or hand-edited links). */
export const parseFabricPattern = (raw: string | null): FabricPattern | undefined =>
  (FABRIC_PATTERNS as readonly string[]).includes(raw ?? '') ? (raw as FabricPattern) : undefined;
