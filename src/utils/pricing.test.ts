import { describe, it, expect } from 'vitest';
import { formatPrice, formatPriceShort, salePercent, formatPercentOff } from './pricing';

describe('formatPrice', () => {
  it('puts the euro sign after the number, with a decimal comma', () => {
    expect(formatPrice(9.75).replace(/\s/g, ' ')).toBe('9,75 €');
  });

  it('shows a dash when there is no price', () => {
    expect(formatPrice(undefined)).toBe('—');
  });
});

// The header's free-shipping line reads the amount from the shipping rate (it said 50 € while the
// rate was 60 €): a whole amount without cents, any other with them.
describe('formatPriceShort', () => {
  it('drops the cents of a whole amount', () => {
    expect(formatPriceShort(60).replace(/\s/g, ' ')).toBe('60 €');
  });

  it('keeps them otherwise', () => {
    expect(formatPriceShort(59.9).replace(/\s/g, ' ')).toBe('59,90 €');
  });
});

// 2026-10-26: the offer label shows how much comes off («OFERTA | −40 %»).
describe('salePercent', () => {
  it('rounds down, so the label never promises more than the real discount', () => {
    expect(salePercent(5.95, 9.95)).toBe(40);  // 40,2 %
    expect(salePercent(5.00, 9.95)).toBe(49);  // 49,7 %
    expect(salePercent(4.95, 9.95)).toBe(50);  // 50,3 %
    expect(salePercent(5.95, 13.50)).toBe(55); // 55,9 %
    expect(salePercent(6, 12)).toBe(50);       // exact, no float slip to 49
  });

  it('is 0 without a sale', () => {
    expect(salePercent(9.95, 9.95)).toBe(0);
    expect(salePercent(9.95, 0)).toBe(0);
    expect(salePercent(9.90, 9.95)).toBe(0); // under 1 %
  });

  it('writes the percentage the way the language does', () => {
    expect(formatPercentOff(40).replace(/\s/g, ' ')).toBe('−40 %');
  });
});
