import { describe, it, expect } from 'vitest';
import { formatPrice, formatPriceShort } from './pricing';

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
