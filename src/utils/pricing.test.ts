import { describe, it, expect } from 'vitest';
import { formatPrice } from './pricing';

describe('formatPrice', () => {
  it('puts the euro sign after the number, with a decimal comma', () => {
    expect(formatPrice(9.75).replace(/\s/g, ' ')).toBe('9,75 €');
  });

  it('shows a dash when there is no price', () => {
    expect(formatPrice(undefined)).toBe('—');
  });
});
