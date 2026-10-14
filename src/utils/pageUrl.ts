/** A page's storefront URL. Categories too live at /<slug> (audit 2026-10-14: /pages/<slug> was a
 *  second URL for the same page; the server 301s it). */
export function pageUrl(type: string, slug: string): string {
  if (type === 'Default') return '/';
  // The menu entry for gift cards (next to Ofertas) opens the storefront's own page, whatever
  // slug staff gave the entry.
  if (type === 'GiftCards') return '/tarjeta-regalo';
  return `/${slug}`;
}

/** Menu link modifier: Ofertas (bold red) and Tarjeta regalo (bold brand green) stand out
 *  wherever they sit in the menu. */
export function menuItemClass(item: { type: string }): string {
  if (item.type === 'Offers') return ' is-offers';
  if (item.type === 'GiftCards') return ' is-gift-cards';
  return '';
}
