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
