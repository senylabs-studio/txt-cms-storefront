import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from './CheckoutPage';
import type { Cart, CheckoutResponse, StorefrontProfile } from '../../types';
import type { ApplicableShippingRate } from '../../services/shippingService';

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
// PayPal has its own tests (PayPalCheckoutButton.test.tsx); here it just must not load the SDK.
vi.mock('./PayPalCheckoutButton', () => ({ default: () => null }));

const cartWithItems = (): Cart => ({
  id: 1,
  expiresAt: '2099-01-01',
  discountPercent: 0, couponDiscountAmount: 0, recargoEquivalenciaPercent: 0, recargoEquivalenciaAmount: 0,
  total: 20,
  items: [
    { id: 1, productName: 'Tela azul', productCode: 'TA1', originalUnitPrice: 10, unitPrice: 10, quantity: 2, subtotal: 20, availableStock: 5, minQuantity: 0.3, quantityStep: 0.05 },
  ],
});

const profile = (): StorefrontProfile => ({
  id: 1,
  name: 'Jane',
  email: 'jane@example.com',
  isGuest: false,
  deletionRequested: false,
  addresses: [
    { id: 1, alias: 'Casa', recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES', isDefault: true },
  ],
  paymentMethods: [],
});

const validShippingRate: ApplicableShippingRate = {
  name: 'Standard', price: 5, shippingCost: 5, isFree: false,
};

const checkoutResponse: CheckoutResponse = {
  merchantParameters: 'params',
  signature: 'sig',
  signatureVersion: 'v1',
  redsysUrl: 'https://redsys.example/pay',
  amount: 2000,
  shippingCost: 0,
  couponDiscountAmount: 0,
  recargoEquivalenciaAmount: 0,
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockCart.cart = null;
    getProfile.mockResolvedValue(profile());
    getApplicableShippingRate.mockResolvedValue(validShippingRate);
    HTMLFormElement.prototype.submit = vi.fn();
  });

  it('redirects to /login when not authenticated', () => {
    mockAuth.isAuthenticated = false;
    render(<CheckoutPage />);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('shows an empty-cart message and no redsys form when the cart has no items', () => {
    mockCart.cart = { id: 1, expiresAt: '2099-01-01', discountPercent: 0, couponDiscountAmount: 0, recargoEquivalenciaPercent: 0, recargoEquivalenciaAmount: 0, total: 0, items: [] };
    render(<CheckoutPage />);
    expect(screen.getByText('checkout.cartEmpty')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'checkout.proceed' })).not.toBeInTheDocument();
  });

  it('navigates to /catalog from the empty-cart state', () => {
    mockCart.cart = { id: 1, expiresAt: '2099-01-01', discountPercent: 0, couponDiscountAmount: 0, recargoEquivalenciaPercent: 0, recargoEquivalenciaAmount: 0, total: 0, items: [] };
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

  // Regression test: handleProceedToPayment never reset `loading` on success (it expects the
  // browser to navigate away to Redsys) — if the customer hits Back before completing payment,
  // most browsers restore this exact page (including its JS state) from the back/forward cache
  // instead of reloading, which used to leave the button stuck on "Procesando…" forever with no
  // way to retry.
  it('resets the stuck "processing" state when the page is restored from the back/forward cache', async () => {
    mockCart.cart = cartWithItems();
    checkout.mockResolvedValue(checkoutResponse);
    render(<CheckoutPage />);

    await waitFor(() => expect(getProfile).toHaveBeenCalled());
    const proceedBtn = await screen.findByRole('button', { name: 'checkout.proceed' });
    fireEvent.click(proceedBtn);

    await waitFor(() => expect(HTMLFormElement.prototype.submit).toHaveBeenCalled());
    expect(proceedBtn).toBeDisabled();

    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'checkout.proceed' })).not.toBeDisabled());
  });

  // Regression test: the displayed recargo/Total used to be computed from cart.recargoEquivalenciaAmount
  // as-is, which the backend only ever computes on subtotal-coupon (shipping is unknown at cart
  // time) — while the real charge (CheckoutService.InitiatePaymentAsync) computes recargo on
  // subtotal-coupon+shipping. That meant this page quoted the customer a lower Total than what
  // Redsys actually charged a few clicks later, growing with the shipping cost. The estimate is
  // now scaled proportionally to include shipping in the recargo base.
  it('scales the displayed recargo estimate to include the shipping cost, not just subtotal', async () => {
    mockCart.cart = {
      id: 1, expiresAt: '2099-01-01', discountPercent: 0, couponDiscountAmount: 0,
      recargoEquivalenciaPercent: 5.2, recargoEquivalenciaAmount: 10, // 10% of the €100 subtotal, for a clean expected number
      total: 110,
      items: [
        { id: 1, productName: 'Tela azul', productCode: 'TA1', originalUnitPrice: 100, unitPrice: 100, quantity: 1, subtotal: 100, availableStock: 5, minQuantity: 0.3, quantityStep: 0.05 },
      ],
    };
    render(<CheckoutPage />);

    await waitFor(() => expect(getApplicableShippingRate).toHaveBeenCalled());

    // subtotal 100, shipping 5 (validShippingRate), recargo ratio 10/100 = 0.1
    // -> estimatedRecargo = (100 + 5) * 0.1 = 10.50, estimatedTotal = 100 + 5 + 10.50 = 115.50
    expect(await screen.findByText('€10.50')).toBeInTheDocument();
    expect(await screen.findByText('€115.50')).toBeInTheDocument();
  });

  // Regression test: the shipping-rate effect had no cancellation guard, so switching the
  // shipping address twice in quick succession could let a slower, stale lookup for the FIRST
  // address overwrite the rate already shown for the SECOND (currently selected) address.
  it('ignores a stale shipping-rate response from an address the customer already switched away from', async () => {
    mockCart.cart = cartWithItems();
    let resolveFirst!: (rate: ApplicableShippingRate) => void;
    let resolveSecond!: (rate: ApplicableShippingRate) => void;
    const first = new Promise<ApplicableShippingRate>(res => { resolveFirst = res; });
    const second = new Promise<ApplicableShippingRate>(res => { resolveSecond = res; });
    getApplicableShippingRate.mockImplementationOnce(() => first).mockImplementationOnce(() => second);
    const twoAddresses: StorefrontProfile = {
      ...profile(),
      addresses: [
        { id: 1, alias: 'Casa', recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES', isDefault: true },
        { id: 2, alias: 'Trabajo', recipientName: 'Jane', street: 'Rue 2', city: 'Paris', postalCode: '75001', country: 'FR', isDefault: false },
      ],
    };
    getProfile.mockResolvedValue(twoAddresses);
    render(<CheckoutPage />);

    await waitFor(() => expect(getApplicableShippingRate).toHaveBeenCalledTimes(1)); // default address (id 1)

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '2' } }); // switch to the second address
    await waitFor(() => expect(getApplicableShippingRate).toHaveBeenCalledTimes(2));

    resolveSecond({ name: 'RateB', price: 8, shippingCost: 8, isFree: false });
    await screen.findByText('RateB');

    // The first (now-stale) address's slower response arrives after the switch — must be ignored.
    resolveFirst({ name: 'RateA', price: 3, shippingCost: 3, isFree: false });
    await new Promise(r => setTimeout(r, 0));

    expect(screen.getByText('RateB')).toBeInTheDocument();
    expect(screen.queryByText('RateA')).not.toBeInTheDocument();
  });

  it('disables "proceed to payment" when no shipping rate covers the address', async () => {
    // Regression test: the backend now blocks this case rather than silently shipping for
    // free, and the button must not let the customer click through the warning either.
    mockCart.cart = cartWithItems();
    getApplicableShippingRate.mockResolvedValue(null);
    render(<CheckoutPage />);

    await waitFor(() => expect(getApplicableShippingRate).toHaveBeenCalled());
    const proceedBtn = await screen.findByRole('button', { name: 'checkout.proceed' });
    expect(proceedBtn).toBeDisabled();
    expect(screen.getByText('checkout.noShippingRate')).toBeInTheDocument();
  });
});
