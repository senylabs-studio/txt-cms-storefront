import type { StorefrontPageBlock } from '../types';

/** Lowercase, accents stripped, tags removed: "¿Envíos?" matches "envios". */
export const normalizeSearch = (text: string): string =>
  text.replace(/<[^>]*>/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const isAccordion = (b: StorefrontPageBlock) =>
  b.type === 'HeaderParagraph' && b.config.variant === 'accordion';

const accordionText = (b: StorefrontPageBlock): string => {
  if (b.type !== 'HeaderParagraph') return '';
  const c = b.config;
  return normalizeSearch(`${c.headerText ?? c.header ?? ''} ${c.paragraphText ?? c.text ?? ''}`);
};

export interface FaqFilterResult {
  /** Block ids to leave out: non-matching accordions, plus a heading whose whole group of accordions is filtered out. */
  hidden: Set<number>;
  matches: number;
  total: number;
}

/**
 * What a FaqSearch block's query hides on its page. Every word of the query must appear in the
 * question or its answer. A plain Header right before a run of accordions is that group's title
 * ("Envíos"), so it disappears together with them when none of them match.
 */
export const filterFaqBlocks = (blocks: StorefrontPageBlock[], query: string): FaqFilterResult => {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  const accordions = blocks.filter(isAccordion);
  const hidden = new Set<number>();
  if (words.length === 0) return { hidden, matches: accordions.length, total: accordions.length };

  let matches = 0;
  for (const b of accordions) {
    const text = accordionText(b);
    if (words.every(w => text.includes(w))) matches++;
    else hidden.add(b.id);
  }

  blocks.forEach((b, i) => {
    if (b.type !== 'Header') return;
    const group: StorefrontPageBlock[] = [];
    for (let j = i + 1; j < blocks.length && isAccordion(blocks[j]); j++) group.push(blocks[j]);
    if (group.length > 0 && group.every(g => hidden.has(g.id))) hidden.add(b.id);
  });

  return { hidden, matches, total: accordions.length };
};
