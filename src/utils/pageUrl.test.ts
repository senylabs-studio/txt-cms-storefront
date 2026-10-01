import { describe, it, expect } from 'vitest';
import { pageUrl } from './pageUrl';

describe('pageUrl', () => {
  it('routes the Default page type to the site root regardless of slug', () => {
    expect(pageUrl('Default', 'anything')).toBe('/');
  });

  it('routes Category pages under /pages/:slug', () => {
    expect(pageUrl('Category', 'camisas')).toBe('/pages/camisas');
  });

  it('routes the gift card menu entry to the gift card page whatever its slug', () => {
    expect(pageUrl('GiftCards', 'tarjeta-regalo')).toBe('/tarjeta-regalo');
    expect(pageUrl('GiftCards', 'regalos')).toBe('/tarjeta-regalo');
  });

  it('routes every other page type to /:slug', () => {
    expect(pageUrl('Content', 'sobre-nosotros')).toBe('/sobre-nosotros');
    expect(pageUrl('PrivacyPolicy', 'privacidad')).toBe('/privacidad');
  });
});
