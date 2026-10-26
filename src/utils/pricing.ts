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

/** Like formatPrice, without the cents of a whole amount: "60 €" for a headline figure. */
export function formatPriceShort(value: number): string {
  const locale = PRICE_LOCALES[(i18next.language ?? 'es').slice(0, 2)] ?? 'es-ES';
  const digits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

/** How much a sale takes off, in whole percent, rounded DOWN: the label never promises more than
 *  the real discount (5,00 € from 9,95 € is 49,7 % → 49). 0 when there's no sale. */
export function salePercent(price: number, originalPrice: number): number {
  if (!(originalPrice > 0) || !(originalPrice > price)) return 0;
  return Math.floor((1 - price / originalPrice) * 100 + 1e-9);
}

/** "−40 %" in Spanish and Catalan, "−40%" in English (each language's own percent style). */
export function formatPercentOff(percent: number): string {
  const locale = PRICE_LOCALES[(i18next.language ?? 'es').slice(0, 2)] ?? 'es-ES';
  return `−${new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(percent / 100)}`;
}
