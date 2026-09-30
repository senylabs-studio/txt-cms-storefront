import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VariantCard from './VariantCard';
import type { StorefrontVariant } from '../../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('../../../contexts/CartContext', () => ({ useCart: () => ({ addItem: vi.fn(), loading: false }) }));
vi.mock('../../../contexts/AuthGateContext', () => ({ useAuthGate: () => ({ requireAuth: vi.fn() }) }));
vi.mock('../../common/FavoriteButton/FavoriteButton', () => ({ default: () => null }));
vi.mock('../../common/NotifyMeButton/NotifyMeButton', () => ({ default: () => null }));

const variant = (over: Partial<StorefrontVariant>): StorefrontVariant => ({
  id: 1, name: 'Cretona lisa', code: 'C1', price: 6, originalPrice: 6, discountPercent: 0, availableStock: 5,
  productId: 1, productName: 'Cretona lisa', productSlug: 'cretona', minQuantity: 0.5, quantityStep: 0.5, ...over,
} as StorefrontVariant);

const title = () => screen.getByRole('heading').textContent;
const productLabel = (container: HTMLElement) => container.querySelector('.product-card-product')!.textContent;

// The card's title is what tells sibling variants apart in the catalog; the product's name goes
// small above it, where the type's name (COLOR, REFERENCIA) used to be.
describe('VariantCard title', () => {
  it("is the variant's type value, with the product name above", () => {
    const { container } = render(<MemoryRouter><VariantCard variant={variant({ typeValue: 'Blanco', productTypeName: 'Color' })} /></MemoryRouter>);
    expect(title()).toBe('Blanco');
    expect(productLabel(container)).toBe('Cretona lisa');
    expect(screen.queryByText('Color')).toBeNull();
  });

  it("is the variant's own name when its type's values are hidden (Referencia)", () => {
    const { container } = render(<MemoryRouter><VariantCard variant={variant({ productName: 'Coralina Estampada', name: 'Coralina Flanagan Bleu Jaune' })} /></MemoryRouter>);
    expect(title()).toBe('Coralina Flanagan Bleu Jaune');
    expect(productLabel(container)).toBe('Coralina Estampada');
  });

  it("doesn't repeat the product name when that's all there is", () => {
    const { container } = render(<MemoryRouter><VariantCard variant={variant({})} /></MemoryRouter>);
    expect(title()).toBe('Cretona lisa');
    expect(productLabel(container)?.trim()).toBe('');
  });
});
