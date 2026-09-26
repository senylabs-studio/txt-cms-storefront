import { describe, it, expect } from 'vitest';
import { tocSections } from './tableOfContents';
import type { StorefrontPageBlock } from '../types';

const b = (id: number, type: string, config: Record<string, unknown>) => ({ id, type, sortOrder: id, config }) as StorefrontPageBlock;

describe('tocSections', () => {
  it('takes h1/h2 headings in page order and skips sub-headings, accordions, callouts and empty ones', () => {
    const sections = tocSections([
      b(1, 'HeaderParagraph', { headerText: 'Stock', paragraphText: '', level: 1 }),          // numeric 1 → h2
      b(2, 'HeaderParagraph', { headerText: 'Derecho de desistimiento', level: 2 }),         // numeric 2 → h3
      b(3, 'Header', { text: 'Devoluciones', level: 'h2' }),
      b(4, 'Header', { text: 'Detalle', level: 'h3' }),
      b(5, 'HeaderParagraph', { headerText: '¿Pedido mínimo?', level: 'h2', variant: 'accordion' }),
      b(6, 'HeaderParagraph', { headerText: 'Aviso', level: 'h2', variant: 'callout' }),
      b(7, 'Header', { text: '   ', level: 'h2' }),
      b(8, 'HeaderParagraph', { header: 'Legacy', text: '<p>x</p>' }),                      // legacy names, default h2
      b(9, 'Paragraph', { text: '<p>Texto</p>' }),
    ]);
    expect(sections).toEqual([
      { blockId: 1, text: 'Stock' },
      { blockId: 3, text: 'Devoluciones' },
      { blockId: 8, text: 'Legacy' },
    ]);
  });
});
