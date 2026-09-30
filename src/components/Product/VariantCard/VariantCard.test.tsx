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

const nameLine = () => screen.getByRole('heading').textContent;

// The card's name line is what tells sibling variants apart in the catalog.
describe('VariantCard name line', () => {
  it('shows the type value when the variant is named like its product', () => {
    render(<MemoryRouter><VariantCard variant={variant({ typeValue: 'Blanco', productTypeName: 'Color' })} /></MemoryRouter>);
    expect(nameLine()).toBe('Cretona lisa · Blanco');
  });

  it("shows the variant's own name, and the value only when the name doesn't already say it", () => {
    render(<MemoryRouter><VariantCard variant={variant({ productName: 'Coralina Estampada', name: 'Coralina Flanagan Bleu', typeValue: 'Bleu' })} /></MemoryRouter>);
    expect(nameLine()).toBe('Coralina Estampada · Coralina Flanagan Bleu');
  });

  it('no longer shows the type name (COLOR, REFERENCIA)', () => {
    render(<MemoryRouter><VariantCard variant={variant({ typeValue: 'Blanco', productTypeName: 'Color' })} /></MemoryRouter>);
    expect(screen.queryByText('Color')).toBeNull();
  });
});
