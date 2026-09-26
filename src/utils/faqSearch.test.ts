import { describe, it, expect } from 'vitest';
import { filterFaqBlocks, normalizeSearch } from './faqSearch';
import type { StorefrontPageBlock } from '../types';

const q = (id: number, headerText: string, paragraphText: string) =>
  ({ id, type: 'HeaderParagraph', sortOrder: id, config: { headerText, paragraphText, variant: 'accordion' } }) as StorefrontPageBlock;
const h = (id: number, text: string) => ({ id, type: 'Header', sortOrder: id, config: { text, level: 'h2' } }) as StorefrontPageBlock;

const PAGE = [
  h(1, 'Pedidos'),
  q(2, '¿Cuál es el pedido mínimo?', '<p>10€ más gastos de envío.</p>'),
  q(3, '¿Puedo pedir muestras?', '<p>Sí, escríbenos.</p>'),
  h(4, 'Envíos'),
  q(5, '¿Hacéis envíos a Canarias?', '<p>Sí, en 10 días laborables.</p>'),
];

describe('normalizeSearch', () => {
  it('drops accents, case and tags', () => {
    expect(normalizeSearch('<p>¿Envíos a CANARIAS?</p>')).toBe('¿envios a canarias?');
  });
});

describe('filterFaqBlocks', () => {
  it('hides nothing without a query', () => {
    expect(filterFaqBlocks(PAGE, '  ')).toEqual({ hidden: new Set(), matches: 3, total: 3 });
  });

  it('matches questions and answers accent-insensitively and hides the emptied group heading', () => {
    const r = filterFaqBlocks(PAGE, 'muestras');
    expect([...r.hidden].sort()).toEqual([2, 4, 5]);
    expect(r.matches).toBe(1);
  });

  it('requires every word, searching the answer too', () => {
    expect(filterFaqBlocks(PAGE, 'dias canarias').hidden).toEqual(new Set([1, 2, 3]));
  });

  it('never hides non-FAQ blocks', () => {
    const para = { id: 9, type: 'Paragraph', sortOrder: 9, config: { text: 'Intro' } } as StorefrontPageBlock;
    expect(filterFaqBlocks([para, ...PAGE], 'zzz').hidden.has(9)).toBe(false);
  });
});
