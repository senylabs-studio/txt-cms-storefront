import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import PageBlockRenderer from './PageBlockRenderer';
import type { StorefrontPageBlock } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  // FeaturedProductsBlock/VariantCard transitively import src/i18n.ts, whose module-level
  // `i18n.use(initReactI18next)` would otherwise blow up once this mock replaces the real export.
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// Defense-in-depth regression test: the backend (PageBlockContentSanitizer) is the real trust
// boundary and already strips this before it's ever stored, but this component still ran raw
// Config text straight through dangerouslySetInnerHTML with zero sanitization of its own — a bug
// or a future backend regression there would otherwise turn into a live XSS for every storefront
// visitor on its own, with nothing here to catch it.
describe('PageBlockRenderer', () => {
  it('Paragraph block strips a script tag from rich text before rendering', () => {
    const block = {
      id: 1,
      type: 'Paragraph',
      config: { text: '<p>Hola</p><script>window.__pwned = true;</script>' },
      sortOrder: 0,
    } as StorefrontPageBlock;

    const { container } = render(<PageBlockRenderer blocks={[block]} />);

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('Hola');
  });

  it('Paragraph block strips an injected img tag entirely (not part of the rich-text allow-list)', () => {
    const block = {
      id: 1,
      type: 'Paragraph',
      config: { text: '<img src=x onerror="window.__pwned = true">' },
      sortOrder: 0,
    } as StorefrontPageBlock;

    const { container } = render(<PageBlockRenderer blocks={[block]} />);

    expect(container.querySelector('img')).toBeNull();
  });

  it('HeaderParagraph block strips a script tag from paragraphText', () => {
    const block = {
      id: 1,
      type: 'HeaderParagraph',
      config: { headerText: 'Título', paragraphText: '<p>Ok</p><script>alert(1)</script>' },
      sortOrder: 0,
    } as StorefrontPageBlock;

    const { container } = render(<PageBlockRenderer blocks={[block]} />);

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('Ok');
  });

  it('ImageText block strips a script tag from text', () => {
    const block = {
      id: 1,
      type: 'ImageText',
      config: { text: '<p>Ok</p><script>alert(1)</script>' },
      sortOrder: 0,
    } as StorefrontPageBlock;

    const { container } = render(<PageBlockRenderer blocks={[block]} />);

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('Ok');
  });

  it('keeps tags a legitimate rich-text edit can actually produce', () => {
    const block = {
      id: 1,
      type: 'Paragraph',
      config: { text: '<p>Hola <strong>mundo</strong> <a href="https://example.com">enlace</a></p>' },
      sortOrder: 0,
    } as StorefrontPageBlock;

    const { container } = render(<PageBlockRenderer blocks={[block]} />);

    expect(container.querySelector('strong')?.textContent).toBe('mundo');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });
});
