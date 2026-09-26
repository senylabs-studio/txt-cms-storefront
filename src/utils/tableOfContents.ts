import type { StorefrontPageBlock } from '../types';

export interface TocSection {
  blockId: number;
  text: string;
}

/** Anchor id for a section heading's block — what the index links to. */
export const sectionAnchor = (blockId: number) => `seccion-${blockId}`;

const headingTag = (level: unknown): string => {
  if (typeof level === 'number') return ['h2', 'h3', 'h4', 'h5', 'h6'][level - 1] ?? 'h2';
  const s = String(level ?? 'h2').toLowerCase();
  return /^h[1-6]$/.test(s) ? s : 'h2';
};

/**
 * The page's top-level sections: Header blocks and plain Header + Paragraph blocks rendered as
 * h1/h2. Sub-headings (h3+) and FAQ accordions / callouts aren't sections of their own.
 */
export const tocSections = (blocks: StorefrontPageBlock[]): TocSection[] =>
  blocks.flatMap(b => {
    let text = '';
    if (b.type === 'Header') {
      if (!['h1', 'h2'].includes(headingTag(b.config.level))) return [];
      text = b.config.text ?? '';
    } else if (b.type === 'HeaderParagraph') {
      const v = b.config.variant;
      if ((v && v !== 'default') || !['h1', 'h2'].includes(headingTag(b.config.level))) return [];
      text = b.config.headerText ?? b.config.header ?? '';
    } else {
      return [];
    }
    text = text.trim();
    return text ? [{ blockId: b.id, text }] : [];
  });
