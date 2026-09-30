import { describe, it, expect } from 'vitest';
import { variantCardTitle } from './variantTitle';

describe('variantCardTitle', () => {
  it('titles a variant by its type value, product name above', () => {
    expect(variantCardTitle({ name: 'Cretona lisa', productName: 'Cretona lisa', typeValue: 'Blanco' }))
      .toEqual({ title: 'Blanco', productLabel: 'Cretona lisa' });
  });

  it("falls back to the variant's name when its type's values are hidden", () => {
    expect(variantCardTitle({ name: 'Coralina Flanagan', productName: 'Coralina Estampada' }))
      .toEqual({ title: 'Coralina Flanagan', productLabel: 'Coralina Estampada' });
  });

  it("doesn't repeat the product name", () => {
    expect(variantCardTitle({ name: 'Cretona lisa', productName: 'Cretona lisa' }).productLabel).toBe(' ');
  });
});
