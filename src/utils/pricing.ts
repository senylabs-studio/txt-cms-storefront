import i18next from 'i18next';

/** Shared discount-detection logic for anything that renders a price + discount badge
 *  (VariantCard, FeaturedProductsGrid) — each keeps its own markup/styling, but the
 *  "is this discounted, and is it a sale or a group discount" logic lives in one place. */
export interface DiscountInfo {
  hasSaleDiscount: boolean;
  hasGroupDiscount: boolean;
  hasDiscount: boolean;
}

export function getDiscountInfo(price: number, originalPrice: number, discountPercent?: number): DiscountInfo {
  const hasSaleDiscount = originalPrice > price;
  const hasGroupDiscount = (discountPercent ?? 0) > 0;
  return { hasSaleDiscount, hasGroupDiscount, hasDiscount: hasSaleDiscount || hasGroupDiscount };
}

const PRICE_LOCALES: Record<string, string> = { es: 'es-ES', ca: 'ca-ES', en: 'en-GB' };

/** A euro amount the way the shopper's language writes it: "9,75 €" in Spanish/Catalan. */
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return '—';
  const locale = PRICE_LOCALES[(i18next.language ?? 'es').slice(0, 2)] ?? 'es-ES';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);
}
