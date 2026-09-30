export function pageUrl(type: string, slug: string): string {
  if (type === 'Default') return '/';
  if (type === 'Category') return `/pages/${slug}`;
  return `/${slug}`;
}

/** Menu link modifier: the Ofertas page stands out (bold red) wherever it sits in the menu. */
export function offersClass(item: { type: string }): string {
  return item.type === 'Offers' ? ' is-offers' : '';
}
