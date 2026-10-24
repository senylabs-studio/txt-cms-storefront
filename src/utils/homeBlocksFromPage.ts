import type { StorefrontHomeBlock } from '../services/homeService';

// Read once: the element is the server's copy for the first paint (server/meta.mjs homeBlocksScript).
let read = false;
let fromPage: { lang: string; blocks: StorefrontHomeBlock[] } | null = null;

/** The home blocks the server put in the page, when they're in the language the app opens in
 *  (else null and the home asks the API as before). Lets the home paint without waiting for it. */
export function homeBlocksFromPage(language: string): StorefrontHomeBlock[] | null {
  if (!read) {
    read = true;
    const el = typeof document !== 'undefined' ? document.getElementById('home-blocks') : null;
    try {
      const blocks = el ? JSON.parse(el.textContent ?? '') : null;
      if (Array.isArray(blocks)) fromPage = { lang: el!.getAttribute('data-lang') ?? '', blocks };
    } catch { /* unreadable: ask the API */ }
  }
  return fromPage && fromPage.lang === language.slice(0, 2) ? fromPage.blocks : null;
}
