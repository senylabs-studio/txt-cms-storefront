import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import PageBlockRenderer from './PageBlockRenderer';
import type { StorefrontPageBlock } from '../../types';

const settings = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../../contexts/SiteSettingsContext', () => ({ useSiteSettings: () => settings.current }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es', resolvedLanguage: 'es' } }),
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

// Contact page regression tests: a checkbox field with an empty label showed its "*" alone on the
// line above, and two such checkboxes shared the id "field-", so clicking the second one's text
// ticked the first.
describe('PageBlockRenderer FormField checkboxes', () => {
  const checkbox = (id: number, placeholder: string, required: boolean) => ({
    id, type: 'FormField', sortOrder: id,
    config: { label: '', fieldType: 'checkbox', placeholder, required },
  }) as StorefrontPageBlock;

  it('puts the required mark on the checkbox line and gives each checkbox its own label', () => {
    const { container, getByLabelText } = render(<PageBlockRenderer blocks={[
      checkbox(1, 'He leído y acepto la Política de Privacidad', true),
      checkbox(2, 'Acepto recibir comunicaciones comerciales', false),
    ]} />);

    expect(container.querySelector('.pbr-form-label')).toBeNull();
    const privacyLabel = container.querySelectorAll('.form-check-label')[0];
    expect(privacyLabel.textContent).toBe('He leído y acepto la Política de Privacidad*');
    const privacy = getByLabelText(/Política de Privacidad/) as HTMLInputElement;
    const marketing = getByLabelText(/comunicaciones comerciales/) as HTMLInputElement;
    expect(privacy).not.toBe(marketing);
    expect(privacy.id).not.toBe(marketing.id);
  });
});

describe('PageBlockRenderer block variants', () => {
  const renderBlock = (type: string, config: Record<string, unknown>) =>
    render(<PageBlockRenderer blocks={[{ id: 1, type, config, sortOrder: 0 } as StorefrontPageBlock]} />).container;

  it('HeaderParagraph accordion renders a collapsed <details> with the question as its heading', () => {
    const c = renderBlock('HeaderParagraph', {
      headerText: '¿Cuál es el pedido mínimo?', paragraphText: '<p>10 €</p><script>x()</script>', level: 1, variant: 'accordion',
    });

    const details = c.querySelector('details.pbr-accordion');
    expect(details).not.toBeNull();
    expect(details!.hasAttribute('open')).toBe(false);
    expect(details!.querySelector('summary h2')!.textContent).toBe('¿Cuál es el pedido mínimo?');
    expect(details!.textContent).toContain('10 €');
    expect(c.querySelector('script')).toBeNull();
  });

  it('HeaderParagraph callout renders its icon and button, and hides the button without a url', () => {
    const withButton = renderBlock('HeaderParagraph', {
      headerText: 'Envío gratuito', paragraphText: '<p>Desde 50 €</p>', variant: 'callout', icon: 'truck',
      buttonText: 'Ver tarifas', buttonUrl: '/condiciones-de-envio',
    });
    expect(withButton.querySelector('.pbr-callout .pbr-callout-icon svg')).not.toBeNull();
    expect(withButton.querySelector('a.pbr-callout-btn')!.getAttribute('href')).toBe('/condiciones-de-envio');

    const withoutUrl = renderBlock('HeaderParagraph', { headerText: 'Aviso', variant: 'callout', buttonText: 'Ver', buttonUrl: '' });
    expect(withoutUrl.querySelector('a.pbr-callout-btn')).toBeNull();
  });

  it('HeaderParagraph with no variant keeps the plain heading + text markup', () => {
    const c = renderBlock('HeaderParagraph', { headerText: 'Hola', paragraphText: '<p>Texto</p>', level: 1 });
    expect(c.querySelector('details')).toBeNull();
    expect(c.querySelector('.pbr-callout')).toBeNull();
    expect(c.querySelector('h2')!.textContent).toBe('Hola');
  });

  it.each([
    ['check', 'ul.pbr-list-check'],
    ['steps', 'ol.pbr-list-steps'],
    ['chips', 'ul.pbr-list-chips'],
    ['ordered', 'ol.pbr-list'],
    [undefined, 'ul.pbr-list'],
  ])('List variant %s renders %s with every item', (variant, selector) => {
    const c = renderBlock('List', { items: ['Confección', 'Patchwork'], variant });
    const list = c.querySelector(selector);
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll('li')).toHaveLength(2);
  });

  it('Divider stitch renders a separator instead of an <hr>; space renders neither', () => {
    const stitch = renderBlock('Divider', { variant: 'stitch' });
    expect(stitch.querySelector('[role="separator"].pbr-divider-stitch')).not.toBeNull();
    expect(stitch.querySelector('hr')).toBeNull();

    const space = renderBlock('Divider', { variant: 'space', style: { padding: 'md' } });
    expect(space.querySelector('.pbr-divider-space')).not.toBeNull();
    expect(space.querySelector('hr')).toBeNull();

    expect(renderBlock('Divider', {}).querySelector('hr')).not.toBeNull();
  });

  it('Paragraph lead and ImageText card add their variant classes', () => {
    expect(renderBlock('Paragraph', { text: '<p>Hola</p>', variant: 'lead' }).querySelector('.rich-text.pbr-lead')).not.toBeNull();
    expect(renderBlock('ImageText', { title: 'Tienda', imageUrl: 'a.jpg', variant: 'card' }).querySelector('.pbr-image-text-card .pbr-image-text-card-media img')).not.toBeNull();
  });
});

describe('PageBlockRenderer new blocks', () => {
  const renderBlock = (type: string, config: Record<string, unknown>) =>
    render(<PageBlockRenderer blocks={[{ id: 1, type, config, sortOrder: 0 } as StorefrontPageBlock]} />).container;

  it('InfoCards grid renders each non-empty card with its value, warning and link', () => {
    const c = renderBlock('InfoCards', { items: [
      { id: 'a', icon: 'pin', label: 'Península y Portugal', value: '2–4', unit: 'días laborables' },
      { id: 'b', label: 'Islas Canarias', value: '10', warning: 'Posible retención aduanera', linkText: 'Ver', linkUrl: '/faq' },
      { id: 'c' },
    ] });

    const cards = c.querySelectorAll('.pbr-cards .pbr-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('.pbr-card-value')!.textContent).toBe('2–4');
    expect(cards[0].querySelector('.pbr-card-label svg')).not.toBeNull();
    expect(cards[1].querySelector('.pbr-card-warning')!.textContent).toContain('retención');
    expect(cards[1].querySelector('a.pbr-card-link')!.getAttribute('href')).toBe('/faq');
  });

  it('InfoCards rows opens a tel: link in the same tab', () => {
    const c = renderBlock('InfoCards', { variant: 'rows', items: [
      { id: 'a', icon: 'phone', label: 'Teléfono', value: '937 906 859', linkText: 'Llamar', linkUrl: 'tel:937906859' },
    ] });

    const link = c.querySelector('.pbr-cards-rows .pbr-card-row a.pbr-card-link')!;
    expect(link.getAttribute('href')).toBe('tel:937906859');
    expect(link.getAttribute('target')).toBeNull();
  });

  it('Timeline renders one milestone per item and skips empty ones', () => {
    const c = renderBlock('Timeline', { items: [
      { id: 'a', year: '1980', title: 'Premià de Mar', description: 'Modistería' },
      { id: 'b' },
    ] });
    const items = c.querySelectorAll('ol.pbr-timeline li');
    expect(items).toHaveLength(1);
    expect(items[0].querySelector('.pbr-timeline-year')!.textContent).toBe('1980');
  });

  it('OpeningHours renders the site-wide hours grouped by day, with a status badge', () => {
    settings.current = { openingHours: [1, 2, 3, 4, 5, 6].map(day => ({ day, ranges: [{ open: '09:30', close: '13:15' }] })) };

    const c = renderBlock('OpeningHours', { title: 'Horario comercial', note: 'Cerrado festivos' });

    const rows = c.querySelectorAll('.pbr-hours-table tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('th')!.textContent).toBe('Lunes – sábado');
    expect(rows[0].querySelectorAll('.pbr-hours-range')).toHaveLength(1);
    expect(rows[0].querySelector('td')!.textContent).toBe('09:30 – 13:15');
    expect(rows[1].textContent).toContain('openingHours.closed');
    expect(c.querySelector('.pbr-hours-status')).not.toBeNull();
    expect(c.querySelector('.pbr-hours-title')!.textContent).toBe('Horario comercial');
  });

  it('OpeningHours hides the status when showStatus is false, and renders nothing without hours', () => {
    settings.current = { openingHours: [{ day: 1, ranges: [{ open: '09:00', close: '14:00' }] }] };
    expect(renderBlock('OpeningHours', { showStatus: false }).querySelector('.pbr-hours-status')).toBeNull();

    settings.current = {};
    expect(renderBlock('OpeningHours', {}).querySelector('.pbr-hours')).toBeNull();
  });
});

describe('PageBlockRenderer boxed variants keep their own padding', () => {
  // The CMS saves padding "none" by default, which buildStyle turns into an inline `padding: 0`.
  const style = { padding: 'none' };
  const renderBlock = (type: string, config: Record<string, unknown>) =>
    render(<PageBlockRenderer blocks={[{ id: 1, type, config, sortOrder: 0 } as StorefrontPageBlock]} />).container;

  it.each([
    ['HeaderParagraph', { headerText: 'A', variant: 'callout', style }, '.pbr-callout'],
    ['HeaderParagraph', { headerText: 'A', variant: 'accordion', style }, '.pbr-accordion'],
    ['ImageText', { title: 'A', imageUrl: 'a.jpg', variant: 'card', style }, '.pbr-image-text-card-body'],
  ])('%s %s has no inline padding', (type, config, selector) => {
    const el = renderBlock(type, config as Record<string, unknown>).querySelector<HTMLElement>(selector)!;
    expect(el.style.padding).toBe('');
  });

  it('OpeningHours has no inline padding', () => {
    settings.current = { openingHours: [{ day: 1, ranges: [{ open: '09:00', close: '14:00' }] }] };
    expect(renderBlock('OpeningHours', { style }).querySelector<HTMLElement>('.pbr-hours')!.style.padding).toBe('');
  });

  it('a plain paragraph still gets the padding preset', () => {
    const el = renderBlock('Paragraph', { text: '<p>x</p>', style: { padding: 'md' } }).querySelector<HTMLElement>('.rich-text')!;
    expect(el.style.padding).toBe('1.25rem 0px');
  });
});

describe('PageBlockRenderer FaqSearch', () => {
  const blocks = [
    { id: 1, type: 'FaqSearch', sortOrder: 0, config: {} },
    { id: 2, type: 'Header', sortOrder: 1, config: { text: 'Pedidos', level: 'h2' } },
    { id: 3, type: 'HeaderParagraph', sortOrder: 2, config: { headerText: '¿Puedo pedir muestras?', paragraphText: '<p>Sí.</p>', variant: 'accordion' } },
    { id: 4, type: 'Header', sortOrder: 3, config: { text: 'Envíos', level: 'h2' } },
    { id: 5, type: 'HeaderParagraph', sortOrder: 4, config: { headerText: '¿Enviáis a Canarias?', paragraphText: '<p>Sí, 10 días.</p>', variant: 'accordion' } },
  ] as StorefrontPageBlock[];

  it('filters the accordions as the shopper types, opening the matches and hiding emptied group headings', () => {
    const { container } = render(<PageBlockRenderer blocks={blocks} />);
    const input = container.querySelector<HTMLInputElement>('.pbr-faq-search input')!;
    expect(container.querySelectorAll('details')).toHaveLength(2);

    fireEvent.change(input, { target: { value: 'canarias' } });

    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(1);
    expect(details[0].hasAttribute('open')).toBe(true);
    expect(container.textContent).not.toContain('Pedidos');
    expect(container.textContent).toContain('Envíos');

    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(container.querySelector('.pbr-faq-search-empty')!.textContent).toBe('faqSearch.noResults');

    fireEvent.change(input, { target: { value: '' } });
    expect(container.querySelectorAll('details')).toHaveLength(2);
  });
});

