export interface CompositionPart { material: string; percentage: number }

/** The composition's materials, or [] when there's none or it can't be read. */
export function parseComposition(json?: string): CompositionPart[] {
  if (!json) return [];
  try {
    const items: CompositionPart[] = JSON.parse(json);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function formatComposition(json?: string): string | null {
  if (!json) return null;
  try {
    const items: { material: string; percentage: number }[] = JSON.parse(json);
    if (!items.length) return null;
    return items.map(i => `${i.percentage}% ${i.material}`).join(' · ');
  } catch {
    return null;
  }
}
