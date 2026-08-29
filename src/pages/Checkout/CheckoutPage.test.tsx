import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from './CheckoutPage';
import type { Cart, CheckoutResponse, StorefrontProfile } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const mockAuth = vi.hoisted(() => ({ isAuthenticated: true }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

const mockCart = vi.hoisted(() => ({ cart: null as Cart | null, fetchCart: vi.fn() }));
vi.mock('../../contexts/CartContext', () => ({
  useCart: () => mockCart,
}));

const { checkout } = vi.hoisted(() => ({ checkout: vi.fn() }));
vi.mock('../../services/cartService', () => ({ checkout }));

const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));
vi.mock('../../services/profileService', () => ({ getProfile }));

const { getApplicableShippingRate } = vi.hoisted(() => ({ getApplicableShippingRate: vi.fn() }));
vi.mock('../../services/shippingService', () => ({ getApplicableShippingRate }));

const cartWithItems = (): Cart => ({
  id: 1,
  expiresAt: '2099-01-01',
  discountPercent: 0, couponDiscountAmount: 0,
  total: 20,
  items: [
    { id: 1, productName: 'Tela azul', productCode: 'TA1', originalUnitPrice: 10, unitPrice: 10, quantity: 2, subtotal: 20, availableStock: 5 },
  ],
});

const profile = (): StorefrontProfile => ({
  id: 1,
  name: 'Jane',
  email: 'jane@example.com',
  isGuest: false,
  addresses: [
    { id: 1, alias: 'Casa', recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES', isDefault: true },
  ],
  paymentMethods: [],
});

const checkoutResponse: CheckoutResponse = {
  merchantParameters: 'params',
  signature: 'sig',
  signatureVersion: 'v1',
  redsysUrl: 'https://redsys.example/pay',
  amount: 2000,
  shippingCost: 0,
  couponDiscountAmount: 0,
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockCart.cart = null;
    getProfile.mockResolvedValue(profile());
    getApplicableShippingRate.mockResolvedValue(null);
    HTMLFormElement.prototype.submit = vi.fn();
  });

  it('redirects to /login when not authenticated', () => {
    mockAuth.isAuthenticated = false;
    render(<CheckoutPage />);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('shows an empty-cart message and no redsys form when the cart has no items', () => {
    mockCart.cart = { id: 1, expiresAt: '2099-01-01', discountPercent: 0, couponDiscountAmount: 0, total: 0, items: [] };
    render(<CheckoutPage />);
    expect(screen.getByText('checkout.cartEmpty')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'checkout.proceed' })).not.toBeInTheDocument();
  });

  it('navigates to /catalog from the empty-cart state', () => {
    mockCart.cart = { id: 1, expiresAt: '2099-01-01', discountPercent: 0, couponDiscountAmount: 0, total: 0, items: [] };
    render(<CheckoutPage />);
    fireEvent.click(screen.getByText('cart.browseCatalog'));
    expect(navigate).toHaveBeenCalledWith('/catalog');
  });

  it('renders the order summary with the correct subtotal/total once addresses load', async () => {
    mockCart.cart = cartWithItems();
    render(<CheckoutPage />);

    await waitFor(() => expect(getProfile).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText('€20.00').length).toBeGreaterThan(0));
  });

  it('submits the Redsys form automatically once checkout() succeeds', async () => {
    mockCart.cart = cartWithItems();
    checkout.mockResolvedValue(checkoutResponse);
    render(<CheckoutPage />);

    await waitFor(() => expect(getProfile).toHaveBeenCalled());
    const proceedBtn = await screen.findByRole('button', { name: 'checkout.proceed' });
    fireEvent.click(proceedBtn);

    await waitFor(() => expect(checkout).toHaveBeenCalled());
    await waitFor(() => expect(HTMLFormElement.prototype.submit).toHaveBeenCalled());
  });

  it('shows a backend error message and does not submit the form when checkout() fails', async () => {
    mockCart.cart = cartWithItems();
    checkout.mockRejectedValue({ response: { data: { message: 'Stock insuficiente' } } });
    render(<CheckoutPage />);

    await waitFor(() => expect(getProfile).toHaveBeenCalled());
    const proceedBtn = await screen.findByRole('button', { name: 'checkout.proceed' });
    fireEvent.click(proceedBtn);

    expect(await screen.findByText('Stock insuficiente')).toBeInTheDocument();
    expect(HTMLFormElement.prototype.submit).not.toHaveBeenCalled();
  });
});
