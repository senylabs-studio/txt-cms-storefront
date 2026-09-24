import { describe, it, expect } from 'vitest';

// The UI ships in exactly es/ca/en. A key present in one file but not another silently renders
// the Spanish fallback (or the raw key) for that language — this keeps the three in lockstep.
const LANGUAGES = ['es', 'ca', 'en'];

const flatten = (node: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(node).flatMap(([key, value]) =>
    value && typeof value === 'object' ? flatten(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]);

// Bundled by Vite at test time — no Node APIs needed (the app's tsconfig has no Node types).
const files = import.meta.glob('../public/locales/*/translation.json', { eager: true, import: 'default' });
const load = (lang: string) => files[`../public/locales/${lang}/translation.json`] as Record<string, unknown>;

const placeholders = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map(m => m[1]).sort();

describe('locale files', () => {
  const byLang = Object.fromEntries(LANGUAGES.map(l => [l, load(l)]));
  const keySets = Object.fromEntries(LANGUAGES.map(l => [l, new Set(flatten(byLang[l]))]));

  it.each(LANGUAGES.slice(1))('%s has exactly the same keys as es', lang => {
    const missing = [...keySets.es].filter(k => !keySets[lang].has(k));
    const extra = [...keySets[lang]].filter(k => !keySets.es.has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it.each(LANGUAGES.slice(1))('%s uses the same {{placeholders}} as es', lang => {
    const get = (obj: Record<string, unknown>, path: string) =>
      path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
    const mismatched = [...keySets.es].filter(k => {
      const es = get(byLang.es, k), other = get(byLang[lang], k);
      return typeof es === 'string' && typeof other === 'string'
        && placeholders(es).join(',') !== placeholders(other).join(',');
    });
    expect(mismatched).toEqual([]);
  });
});
