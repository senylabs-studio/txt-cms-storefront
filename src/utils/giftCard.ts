import type { TFunction } from 'i18next';
import type { CartItem } from '../types';

/** The name a cart line shows: a gift card's comes from the backend in Spanish, so it's
 *  translated here instead. */
export const cartItemName = (item: CartItem, t: TFunction): string =>
  item.giftCard ? t('giftCard.lineName') : item.productName;

/** Allowed purchase amounts snap to min + n × step, clamped to [min, max]. */
export const snapGiftCardAmount = (value: number, min: number, max: number, step: number): number => {
  if (!Number.isFinite(value)) return min;
  const snapped = min + Math.round((value - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
};

/** A few one-click amounts inside the configured range. */
export const giftCardPresets = (min: number, max: number, step: number): number[] =>
  [min, 30, 50, 75, 100, 150]
    .filter((v, i, all) => v >= min && v <= max && (v - min) % step === 0 && all.indexOf(v) === i)
    .sort((a, b) => a - b);
