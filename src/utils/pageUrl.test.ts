import { describe, it, expect } from 'vitest';
import { pageUrl } from './pageUrl';

describe('pageUrl', () => {
  it('routes the Default page type to the site root regardless of slug', () => {
    expect(pageUrl('Default', 'anything')).toBe('/');
  });

  it('routes Category pages under /pages/:slug', () => {
    expect(pageUrl('Category', 'camisas')).toBe('/pages/camisas');
  });

  it('routes every other page type to /:slug', () => {
    expect(pageUrl('Content', 'sobre-nosotros')).toBe('/sobre-nosotros');
    expect(pageUrl('PrivacyPolicy', 'privacidad')).toBe('/privacidad');
  });
});
