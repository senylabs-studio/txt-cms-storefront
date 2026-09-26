import { describe, it, expect, beforeEach } from 'vitest';
import { applyFavicon } from './favicon';

describe('applyFavicon', () => {
  beforeEach(() => { document.head.innerHTML = '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />'; });

  it('points the existing tab icon at the configured image, dropping the SVG type', () => {
    applyFavicon('https://blob/site/favicon-1.png');
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
    expect(link.getAttribute('href')).toBe('https://blob/site/favicon-1.png');
    expect(link.hasAttribute('type')).toBe(false);
    expect(document.querySelectorAll('link[rel="icon"]')).toHaveLength(1);
  });

  it('keeps the built-in icon when no favicon is configured', () => {
    applyFavicon('');
    expect(document.querySelector('link[rel="icon"]')!.getAttribute('href')).toBe('/favicon.svg');
  });
});
