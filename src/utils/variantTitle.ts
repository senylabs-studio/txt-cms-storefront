// How a variant is titled on a product card (catalog, featured products): its type value
// ("Blanco") is what tells it apart from its siblings, so that's the title; for a type whose
// values are hidden from shoppers (Referencia) it's the variant's own name. The product's name goes
// small above it — left empty when the title is already the product name, so it isn't repeated
// (a non-breaking space keeps names aligned across a grid).
export function variantCardTitle(v: { name?: string; productName?: string; typeValue?: string }): { title: string; productLabel: string } {
  const title = v.typeValue || v.name || v.productName || '';
  const productLabel = !v.productName || title === v.productName ? ' ' : v.productName;
  return { title, productLabel };
}
