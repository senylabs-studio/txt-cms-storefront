import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VariantCard from '../../Product/VariantCard/VariantCard';
import type { StorefrontVariant } from '../../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('../../../contexts/CartContext', () => ({ useCart: () => ({ addItem: vi.fn(), loading: false }) }));
vi.mock('../../../contexts/AuthGateContext', () => ({ useAuthGate: () => ({ requireAuth: vi.fn() }) }));
vi.mock('../FavoriteButton/FavoriteButton', () => ({ default: () => null }));
vi.mock('../NotifyMeButton/NotifyMeButton', () => ({ default: () => null }));

const variant = (over: Partial<StorefrontVariant>): StorefrontVariant => ({
  id: 1, name: 'Lino', code: 'L1', price: 10, originalPrice: 10, discountPercent: 0, availableStock: 5,
  productId: 1, productName: 'Lino', productSlug: 'lino', minQuantity: 0.5, quantityStep: 0.5, ...over,
} as StorefrontVariant);

describe('"Nuevo" badge on catalog cards', () => {
  it('shows on a new product', () => {
    render(<MemoryRouter><VariantCard variant={variant({ isNew: true })} /></MemoryRouter>);
    expect(screen.getByText('product.new')).toBeTruthy();
  });

  it('does not show otherwise', () => {
    render(<MemoryRouter><VariantCard variant={variant({ isNew: false })} /></MemoryRouter>);
    expect(screen.queryByText('product.new')).toBeNull();
  });

  it('stacks with the discount badge', () => {
    render(<MemoryRouter><VariantCard variant={variant({ isNew: true, price: 8, originalPrice: 10 })} /></MemoryRouter>);
    expect(screen.getByText('product.new')).toBeTruthy();
    expect(screen.getByText('product.offer')).toBeTruthy();
  });
});
