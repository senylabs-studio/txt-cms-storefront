import { describe, it, expect, afterEach } from 'vitest';
import i18next from 'i18next';
import { formatDate, countryName } from './locale';

describe('locale helpers follow the UI language, not the browser', () => {
  afterEach(() => { i18next.language = 'es'; });

  it('formats dates and country names in Catalan', () => {
    i18next.language = 'ca';
    expect(formatDate('2026-10-08T10:00:00Z', { day: 'numeric', month: 'long', year: 'numeric' })).toContain('octubre');
    expect(countryName('ES')).toBe('Espanya');
  });

  it('formats in English', () => {
    i18next.language = 'en';
    expect(countryName('DE')).toBe('Germany');
    expect(formatDate('2026-10-08T10:00:00Z', { month: 'long' })).toBe('October');
  });

  it('keeps an unknown or empty code', () => {
    expect(countryName('')).toBe('');
    expect(countryName('ZZZ')).toBe('ZZZ');
  });
});
