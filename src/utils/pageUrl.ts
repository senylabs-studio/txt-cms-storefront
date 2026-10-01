export function pageUrl(type: string, slug: string): string {
  if (type === 'Default') return '/';
  if (type === 'Category') return `/pages/${slug}`;
  // The menu entry for gift cards (next to Ofertas) opens the storefront's own page, whatever
  // slug staff gave the entry.
  if (type === 'GiftCards') return '/tarjeta-regalo';
  return `/${slug}`;
}

/** Menu link modifier: the Ofertas page stands out (bold red) wherever it sits in the menu. */
export function offersClass(item: { type: string }): string {
  return item.type === 'Offers' ? ' is-offers' : '';
}
