import { describe, it, expect } from 'vitest';
import { formatComposition } from './composition';

describe('formatComposition', () => {
  it('returns null for undefined input', () => {
    expect(formatComposition(undefined)).toBeNull();
  });

  it('returns null for empty string input', () => {
    expect(formatComposition('')).toBeNull();
  });

  it('returns null for an empty JSON array', () => {
    expect(formatComposition('[]')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(formatComposition('{not valid json')).toBeNull();
  });

  it('formats a single material', () => {
    expect(formatComposition('[{"material":"Algodón","percentage":100}]')).toBe('100% Algodón');
  });

  it('joins multiple materials with " · "', () => {
    const json = JSON.stringify([
      { material: 'Algodón', percentage: 60 },
      { material: 'Poliéster', percentage: 40 },
    ]);
    expect(formatComposition(json)).toBe('60% Algodón · 40% Poliéster');
  });

  it('preserves the given item order rather than sorting by percentage', () => {
    const json = JSON.stringify([
      { material: 'Elastano', percentage: 5 },
      { material: 'Algodón', percentage: 95 },
    ]);
    expect(formatComposition(json)).toBe('5% Elastano · 95% Algodón');
  });
});
