import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import CheckoutPage from './CheckoutPage';
import type { Cart, CheckoutResponse, StorefrontProfile } from '../../types';
import type { ApplicableShippingRate } from '../../services/shippingService';

const mockSettings = vi.hoisted(() => ({ siteName: 'Shop', bankTransferAvailable: false }));
vi.mock('../../contexts/SiteSettingsContext', () => ({ useSiteSettings: () => mockSettings }));
const mockPaymentMethods = vi.hoisted(() => ({ list: [] as { id: number; name: string; logoUrl: string; sortOrder: number }[] }));
vi.mock('../../contexts/PaymentMethodsContext', () => ({ usePaymentMethods: () => mockPaymentMethods.list }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
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

const mockCart = vi.hoisted(() => ({
  cart: null as Cart | null, fetchCart: vi.fn(), loading: false,
  applyCoupon: vi.fn(), removeCoupon: vi.fn(), applyGiftCard: vi.fn(), removeGiftCard: vi.fn(),
}));
vi.mock('../../contexts/CartContext', () => ({
  useCart: () => mockCart,
}));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const { checkout, placeBankTransferOrder } = vi.hoisted(() => ({ checkout: vi.fn(), placeBankTransferOrder: vi.fn() }));
vi.mock('../../services/cartService', () => ({ checkout, placeBankTransferOrder }));

const { getProfile, addAddress } = vi.hoisted(() => ({ getProfile: vi.fn(), addAddress: vi.fn() }));
vi.mock('../../services/profileService', () => ({ getProfile, addAddress, updateAddress: vi.fn() }));
vi.mock('../../services/countryService', () => ({ getVisibleCountries: vi.fn().mockResolvedValue([{ isoCode: 'ES' }]) }));

const { getShippingOptions, getPickupOptions } = vi.hoisted(() => ({ getShippingOptions: vi.fn(), getPickupOptions: vi.fn() }));
vi.mock('../../services/shippingService', () => ({ getShippingOptions, getPickupOptions }));
// PayPal has its own tests (PayPalCheckoutButton.test.tsx); here it just must not load the SDK.
vi.mock('./PayPalCheckoutButton', () => ({ default: () => <div data-testid="paypal-checkout" /> }));
const { getPayPalConfig } = vi.hoisted(() => ({ getPayPalConfig: vi.fn() }));
vi.mock('../../services/paypalService', () => ({ getPayPalConfig }));

const cartWithItems = (): Cart => ({
  id: 1,
  expiresAt: '2099-01-01',
  discountPercent: 0, couponDiscountAmount: 0, recargoEquivalenciaPercent: 0, recargoEquivalenciaAmount: 0, isGiftCardPurchase: false, giftCardAvailable: 0, giftCardAmount: 0, amountDue: 0,
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
  giftCardAmount: 0,
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockCart.cart = null;
    mockSettings.bankTransferAvailable = false;
    mockPaymentMethods.list = [];
    getProfile.mockResolvedValue(profile());
    getShippingOptions.mockResolvedValue([validShippingRate]);
    getPickupOptions.mockResolvedValue([]);
    getPayPalConfig.mockResolvedValue({ enabled: false, environment: 'sandbox', currency: 'EUR' });
    HTMLFormElement.prototype.submit = vi.fn();
  });

  it('redirects to /login when not authenticated', () => {
    mockAuth.isAuthenticated = false;
    render(<CheckoutPage />);
    expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?from=/)); // back here after logging in
  });

  it('shows an empty-cart message and no redsys form when the cart has no items', () => {
    mockCart.cart = { id: 1, expiresAt: '2099-01-01', discountPercent: 0, couponDiscountAmount: 0, recargoEquivalenciaPercent: 0, recargoEquivalenciaAmount: 0, isGiftCardPurchase: false, giftCardAvailable: 0, giftCardAmount: 0, amountDue: 0, total: 0, items: [] };
    render(<CheckoutPage />);
    expect(screen.getByText('checkout.cartEmpty')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'checkout.proceed' })).not.toBeInTheDocument();
  });

  // Lines and quantities are edited in the cart; checkout had no way back but the browser's.
  it('goes back to the cart from the «Volver al carrito» button', async () => {
    mockCart.cart = cartWithItems();
    render(<CheckoutPage />);
    fireEvent.click(screen.getByRole('button', { name: 'checkout.backToCart' }));
    expect(navigate).toHaveBeenCalledWith('/cart');
    await waitFor(() => expect(getProfile).toHaveBeenCalled());
  });

  // With saved addresses there was no way to add another one from here, and going to Mi cuenta for
  // it lost the order notes typed.
  it('adds another address in place, ships to it and keeps the notes', async () => {
    mockCart.cart = cartWithItems();
    const casa = { id: 1, alias: 'Casa', recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES', isDefault: true };
    const trabajo = { id: 2, alias: 'Trabajo', recipientName: 'Jane', street: 'Calle 2', city: 'Madrid', postalCode: '28002', country: 'ES', isDefault: false };
    getProfile.mockResolvedValueOnce({ ...profile(), addresses: [casa] }).mockResolvedValueOnce({ ...profile(), addresses: [casa, trabajo] });
    addAddress.mockResolvedValue(trabajo);
    render(<CheckoutPage />);
    await waitFor(() => expect(getShippingOptions).toHaveBeenCalled());
    const notes = screen.getByPlaceholderText('checkout.notesPlaceholder');
    fireEvent.change(notes, { target: { value: 'Llamar antes' } });

    fireEvent.click(screen.getByRole('button', { name: 'checkout.addOtherAddress' }));
    const dialog = await screen.findByRole('dialog');
    const [alias, recipient, street, postalCode, city] = within(dialog).getAllByRole('textbox');
    fireEvent.change(alias, { target: { value: 'Trabajo' } });
    fireEvent.change(recipient, { target: { value: 'Jane' } });
    fireEvent.change(street, { target: { value: 'Calle 2' } });
    fireEvent.change(postalCode, { target: { value: '28002' } });
    fireEvent.change(city, { target: { value: 'Madrid' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'account.save' }));

    await waitFor(() => expect(addAddress).toHaveBeenCalled());
    await waitFor(() => expect((screen.getByLabelText('checkout.shippingAddress') as HTMLSelectElement).value).toBe('2'));
    // Billing: still «the same» by default; unticked, it keeps the address it had.
    expect(screen.getByLabelText('checkout.billingSameAsShipping')).toBeChecked();
    fireEvent.click(screen.getByLabelText('checkout.billingSameAsShipping'));
    expect((screen.getByLabelText('checkout.billingAddress') as HTMLSelectElement).value).toBe('1');
    expect(navigate).not.toHaveBeenCalled();
    expect((screen.getByPlaceholderText('checkout.notesPlaceholder') as HTMLTextAreaElement).value).toBe('Llamar antes');
  });

  // A customer who skipped the cart's code fields can still enter one here — folded behind a
  // link since 2026-10-24 (two empty fields above the total read as if one were needed).
  it('offers the coupon field in the summary and applies the code typed there', async () => {
    mockCart.cart = cartWithItems();
    mockCart.applyCoupon.mockResolvedValue(undefined);
    render(<CheckoutPage />);
    expect(screen.queryByPlaceholderText('cart.couponPlaceholder')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'checkout.haveCode' }));
    fireEvent.change(screen.getByPlaceholderText('cart.couponPlaceholder'), { target: { value: 'PRUEBA10' } });
    fireEvent.click(screen.getByRole('button', { name: 'cart.applyCoupon' }));
    await waitFor(() => expect(mockCart.applyCoupon).toHaveBeenCalledWith('PRUEBA10'));
  });

  it('shows the applied coupon with its remove button instead of the field', async () => {
    mockCart.cart = { ...cartWithItems(), couponCode: 'PRUEBA10', couponDiscountAmount: 2 };
    render(<CheckoutPage />);
    expect(screen.queryByPlaceholderText('cart.couponPlaceholder')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cart.removeCoupon' })).toBeInTheDocument(); // unfolded
    await waitFor(() => expect(getProfile).toHaveBeenCalled());
  });

  it('navigates to /catalog from the empty-cart state', () => {
    mockCart.cart = { id: 1, expiresAt: '2099-01-01', discountPercent: 0, couponDiscountAmount: 0, recargoEquivalenciaPercent: 0, recargoEquivalenciaAmount: 0, isGiftCardPurchase: false, giftCardAvailable: 0, giftCardAmount: 0, amountDue: 0, total: 0, items: [] };
    render(<CheckoutPage />);
    fireEvent.click(screen.getByText('cart.browseCatalog'));
    expect(navigate).toHaveBeenCalledWith('/catalog');
  });

  // A coupon that brings the order to 0 € with free shipping, no gift card: nothing to pay —
  // the order is confirmed by the button (PayPal can't take 0 €), not "paid with a gift card".
  it('offers to confirm a 0 € order without a gift card', async () => {
    mockCart.cart = { ...cartWithItems(), couponCode: 'GRATIS', couponDiscountAmount: 20, total: 0 };
    getShippingOptions.mockResolvedValue([{ name: 'Gratis', price: 0, shippingCost: 0, isFree: true }]);
    render(<CheckoutPage />);

    expect(await screen.findByText('checkout.nothingToPay')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'checkout.confirmFree' })).toBeInTheDocument();
    expect(screen.queryByText('checkout.coveredByGiftCard')).not.toBeInTheDocument();
  });

  it('renders the order summary with the correct subtotal/total once addresses load', async () => {
    mockCart.cart = cartWithItems();
    render(<CheckoutPage />);

    await waitFor(() => expect(getProfile).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText('20,00 €').length).toBeGreaterThan(0));
  });

  // Canarias, Ceuta, Melilla, non-EU: the server charges each amount without VAT (20 → 16,53,
  // shipping 5 → 4,13) — the summary must show that total, not the VAT-inclusive 25 €.
  it('takes the VAT off the total when the address is outside the VAT area', async () => {
    mockCart.cart = cartWithItems();
    const p = profile();
    p.addresses[0] = { ...p.addresses[0], city: 'Las Palmas', postalCode: '35001' };
    getProfile.mockResolvedValue(p);
    getShippingOptions.mockResolvedValue([{ ...validShippingRate, vatExempt: true, vatPercent: 21 }]);
    render(<CheckoutPage />);

    expect(await screen.findByText('checkout.vatExempt')).toBeInTheDocument();
    await waitFor(() => expect(getShippingOptions).toHaveBeenCalledWith(1));
    expect(screen.getByText('−4,34 €')).toBeInTheDocument();
    expect(screen.getByText('20,66 €')).toBeInTheDocument();
  });

  it('lets the customer choose another delivery option; pickup is not one of them', async () => {
    mockCart.cart = cartWithItems();
    getShippingOptions.mockResolvedValue([
      { id: 1, name: 'Península', price: 5.4, shippingCost: 5.4, isFree: false },
      { id: 2, name: 'Urgente', price: 12, shippingCost: 12, isFree: false },
      { id: 3, name: 'Recogida en tienda', price: 0, shippingCost: 0, isFree: false, isPickup: true },
    ]);
    checkout.mockResolvedValue(checkoutResponse);
    render(<CheckoutPage />);

    const urgent = await screen.findByRole('radio', { name: /Urgente/ });
    expect(screen.getByRole('radio', { name: /Península/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Recogida en tienda/ })).not.toBeInTheDocument();
    fireEvent.click(urgent);

    fireEvent.click(screen.getByText('checkout.proceed'));
    await waitFor(() => expect(checkout).toHaveBeenCalledWith(expect.objectContaining({ shippingAddressId: 1, shippingRateId: 2 })));
  });

  // Picked up in the shop: no delivery address is asked for or sent (nobody can ship it there).
  it('store pickup is chosen first and needs no shipping address', async () => {
    mockCart.cart = cartWithItems();
    const pickupRate = { id: 3, name: 'Recogida en tienda', price: 0, shippingCost: 0, isFree: false, isPickup: true };
    getShippingOptions.mockResolvedValue([validShippingRate, pickupRate]);
    getPickupOptions.mockResolvedValue([pickupRate]);
    checkout.mockResolvedValue(checkoutResponse);
    render(<CheckoutPage />);

    expect(await screen.findByLabelText(/checkout.homeDelivery/)).toBeChecked();
    fireEvent.click(screen.getByLabelText(/checkout.storePickup/));

    expect(await screen.findByText(/checkout.pickupAt/)).toBeInTheDocument();
    expect(screen.queryByLabelText('checkout.shippingAddress')).not.toBeInTheDocument();
    expect(screen.getByLabelText('checkout.billingAddress')).toBeInTheDocument();
    fireEvent.click(screen.getByText('checkout.proceed'));
    await waitFor(() => expect(checkout).toHaveBeenCalledWith(expect.objectContaining({ shippingAddressId: undefined, shippingRateId: 3, billingAddressId: 1 })));
  });

  // Audit 2026-10-14: picking up, the address added from here is for the invoice — it went to
  // the (unused) shipping address and the invoice kept the old one.
  it('picking up, an address added here becomes the billing address', async () => {
    mockCart.cart = cartWithItems();
    const casa = { id: 1, alias: 'Casa', recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES', isDefault: true };
    const empresa = { id: 2, alias: 'Empresa', recipientName: 'Jane SL', street: 'Calle 2', city: 'Madrid', postalCode: '28002', country: 'ES', isDefault: false };
    getProfile.mockResolvedValueOnce({ ...profile(), addresses: [casa] }).mockResolvedValueOnce({ ...profile(), addresses: [casa, empresa] });
    addAddress.mockResolvedValue(empresa);
    getPickupOptions.mockResolvedValue([{ id: 3, name: 'Recogida en tienda', price: 0, shippingCost: 0, isFree: false, isPickup: true }]);
    render(<CheckoutPage />);
    fireEvent.click(await screen.findByLabelText(/checkout.storePickup/));

    fireEvent.click(await screen.findByRole('button', { name: 'checkout.addOtherAddress' }));
    const dialog = await screen.findByRole('dialog');
    const [alias, recipient, street, postalCode, city] = within(dialog).getAllByRole('textbox');
    fireEvent.change(alias, { target: { value: 'Empresa' } });
    fireEvent.change(recipient, { target: { value: 'Jane SL' } });
    fireEvent.change(street, { target: { value: 'Calle 2' } });
    fireEvent.change(postalCode, { target: { value: '28002' } });
    fireEvent.change(city, { target: { value: 'Madrid' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'account.save' }));

    await waitFor(() => expect((screen.getByLabelText('checkout.billingAddress') as HTMLSelectElement).value).toBe('2'));
  });

  it('a customer without addresses can still pick it up', async () => {
    mockCart.cart = cartWithItems();
    getProfile.mockResolvedValue({ ...profile(), addresses: [] });
    getPickupOptions.mockResolvedValue([{ id: 3, name: 'Recogida en tienda', price: 0, shippingCost: 0, isFree: false, isPickup: true }]);
    render(<CheckoutPage />);

    fireEvent.click(await screen.findByLabelText(/checkout.storePickup/));
    await waitFor(() => expect(screen.getByRole('button', { name: 'checkout.proceed' })).toBeEnabled());
  });

  it('offers no delivery choice when the shop has no pickup', async () => {
    mockCart.cart = cartWithItems();
    render(<CheckoutPage />);

    await waitFor(() => expect(getPickupOptions).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'checkout.proceed' })).toBeEnabled());
    expect(screen.queryByLabelText(/checkout.storePickup/)).not.toBeInTheDocument();
  });

  it('submits the Redsys form automatically once checkout() succeeds', async () => {
    mockCart.cart = cartWithItems();
    checkout.mockResolvedValue(checkoutResponse);
    render(<CheckoutPage />);

    await waitFor(() => expect(getProfile).toHaveBeenCalled());
    const proceedBtn = await screen.findByRole('button', { name: 'checkout.proceed' });
    await waitFor(() => expect(proceedBtn).toBeEnabled()); // once the shipping is known
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
    await waitFor(() => expect(proceedBtn).toBeEnabled()); // once the shipping is known
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
    await waitFor(() => expect(proceedBtn).toBeEnabled()); // once the shipping is known
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
      isGiftCardPurchase: false, giftCardAvailable: 0, giftCardAmount: 0, amountDue: 110,
      total: 110,
      items: [
        { id: 1, productName: 'Tela azul', productCode: 'TA1', originalUnitPrice: 100, unitPrice: 100, quantity: 1, subtotal: 100, availableStock: 5, minQuantity: 0.3, quantityStep: 0.05 },
      ],
    };
    render(<CheckoutPage />);

    await waitFor(() => expect(getShippingOptions).toHaveBeenCalled());

    // subtotal 100, shipping 5 (validShippingRate), recargo ratio 10/100 = 0.1
    // -> estimatedRecargo = (100 + 5) * 0.1 = 10.50, estimatedTotal = 100 + 5 + 10.50 = 115.50
    expect(await screen.findByText('10,50 €')).toBeInTheDocument();
    expect(await screen.findByText('115,50 €')).toBeInTheDocument();
  });

  // Regression test: the shipping-rate effect had no cancellation guard, so switching the
  // shipping address twice in quick succession could let a slower, stale lookup for the FIRST
  // address overwrite the rate already shown for the SECOND (currently selected) address.
  it('ignores a stale shipping-rate response from an address the customer already switched away from', async () => {
    mockCart.cart = cartWithItems();
    let resolveFirst!: (rates: ApplicableShippingRate[]) => void;
    let resolveSecond!: (rates: ApplicableShippingRate[]) => void;
    const first = new Promise<ApplicableShippingRate[]>(res => { resolveFirst = res; });
    const second = new Promise<ApplicableShippingRate[]>(res => { resolveSecond = res; });
    getShippingOptions.mockImplementationOnce(() => first).mockImplementationOnce(() => second);
    const twoAddresses: StorefrontProfile = {
      ...profile(),
      addresses: [
        { id: 1, alias: 'Casa', recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES', isDefault: true },
        { id: 2, alias: 'Trabajo', recipientName: 'Jane', street: 'Rue 2', city: 'Paris', postalCode: '75001', country: 'FR', isDefault: false },
      ],
    };
    getProfile.mockResolvedValue(twoAddresses);
    render(<CheckoutPage />);

    await waitFor(() => expect(getShippingOptions).toHaveBeenCalledTimes(1)); // default address (id 1)

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '2' } }); // switch to the second address
    await waitFor(() => expect(getShippingOptions).toHaveBeenCalledTimes(2));

    resolveSecond([{ name: 'RateB', price: 8, shippingCost: 8, isFree: false }]);
    await screen.findByText(/RateB/);

    // The first (now-stale) address's slower response arrives after the switch — must be ignored.
    resolveFirst([{ name: 'RateA', price: 3, shippingCost: 3, isFree: false }]);
    await new Promise(r => setTimeout(r, 0));

    expect(screen.getByText(/RateB/)).toBeInTheDocument();
    expect(screen.queryByText(/RateA/)).not.toBeInTheDocument();
  });

  it('disables "proceed to payment" when no shipping rate covers the address', async () => {
    // Regression test: the backend now blocks this case rather than silently shipping for
    // free, and the button must not let the customer click through the warning either.
    mockCart.cart = cartWithItems();
    getShippingOptions.mockResolvedValue([]);
    render(<CheckoutPage />);

    await waitFor(() => expect(getShippingOptions).toHaveBeenCalled());
    const proceedBtn = await screen.findByRole('button', { name: 'checkout.proceed' });
    expect(await screen.findByText('checkout.noShippingRate')).toBeInTheDocument();
    expect(proceedBtn).toBeDisabled();
  });

  // Nothing delivers to the address (abroad, too heavy): store pickup used to be chosen for the
  // customer without asking. Now they have to pick it.
  it('never chooses store pickup on its own', async () => {
    mockCart.cart = cartWithItems();
    const pickupRate = { id: 3, name: 'Recogida en tienda', price: 0, shippingCost: 0, isFree: false, isPickup: true };
    getShippingOptions.mockResolvedValue([pickupRate]);
    getPickupOptions.mockResolvedValue([pickupRate]);
    render(<CheckoutPage />);

    expect(await screen.findByText('checkout.noShippingRatePickup')).toBeInTheDocument();
    const pickup = screen.getByLabelText(/checkout.storePickup/);
    expect(pickup).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'checkout.proceed' })).toBeDisabled();
    fireEvent.click(pickup);
    await waitFor(() => expect(screen.getByRole('button', { name: 'checkout.proceed' })).toBeEnabled());
  });

  // A failed lookup (API waking up) said "we don't ship there"; now it says so and can retry.
  it('shows a failed shipping lookup as an error with a retry', async () => {
    mockCart.cart = cartWithItems();
    getShippingOptions.mockRejectedValueOnce(new Error('timeout')).mockResolvedValue([validShippingRate]);
    render(<CheckoutPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'checkout.shippingRetry' }));
    expect(screen.queryByText('checkout.noShippingRate')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'checkout.proceed' })).toBeEnabled());
  });

  it('buys gift cards without an address or shipping', async () => {
    getProfile.mockResolvedValue({ ...profile(), addresses: [] });
    mockCart.cart = {
      ...cartWithItems(), isGiftCardPurchase: true, total: 45, amountDue: 45,
      items: [{ id: 2, productName: 'Tarjeta regalo', productCode: 'TARJETA-REGALO', originalUnitPrice: 45, unitPrice: 45, quantity: 1, subtotal: 45, availableStock: 1, minQuantity: 1, quantityStep: 1,
        giftCard: { recipientName: 'Ana', senderName: 'Luis' } }],
    };
    checkout.mockResolvedValue(checkoutResponse);
    render(<CheckoutPage />);

    expect(await screen.findByText('checkout.giftCardDelivery')).toBeInTheDocument();
    expect(screen.queryByText('checkout.noAddresses')).not.toBeInTheDocument();
    expect(screen.queryByText('checkout.shipping')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'checkout.proceed' }));

    await waitFor(() => expect(checkout).toHaveBeenCalledWith(expect.objectContaining({ shippingAddressId: undefined })));
    expect(getShippingOptions).not.toHaveBeenCalled();
  });

  // Audit 2026-10-14 (TRLGDCU art. 97–98, LSSI art. 27): right before ordering, the terms and
  // the withdrawal rules — including that fabric cut to measure has no right of withdrawal.
  it('shows the terms and the withdrawal rules before the order button, opening in a new tab', async () => {
    mockCart.cart = cartWithItems();
    render(<CheckoutPage />);

    const terms = await screen.findByRole('link', { name: 'checkout.legal.terms' });
    expect(terms).toHaveAttribute('href', '/terminos-condiciones');
    expect(terms).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'checkout.legal.withdrawalLink' })).toHaveAttribute('href', '/politica-de-retirada');
    expect(screen.getByText(/^checkout\.legal\.withdrawal\b/)).toBeInTheDocument();
  });

  it('a gift card covering everything places the order without going to Redsys', async () => {
    mockCart.cart = { ...cartWithItems(), giftCardCode: 'ABCD-EFGH-JKLM', giftCardAvailable: 200, giftCardAmount: 20, amountDue: 0 };
    checkout.mockResolvedValue({ ...checkoutResponse, merchantParameters: '', amount: 0, giftCardAmount: 25, orderId: 9 });
    render(<CheckoutPage />);

    const confirm = await screen.findByRole('button', { name: 'checkout.confirmWithGiftCard' });
    await waitFor(() => expect(confirm).not.toBeDisabled());
    fireEvent.click(confirm);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/checkout/success'));
    expect(HTMLFormElement.prototype.submit).not.toHaveBeenCalled();
  });

  it('a gift card covering part shows what is left to pay', async () => {
    mockCart.cart = { ...cartWithItems(), giftCardCode: 'ABCD-EFGH-JKLM', giftCardAvailable: 10, giftCardAmount: 10, amountDue: 10 };
    render(<CheckoutPage />);

    // 20 + 5 shipping − 10 from the card
    await waitFor(() => expect(screen.getByText('15,00 €')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'checkout.proceed' })).toBeInTheDocument();
  });

  // 2026-10-21: «Ir al pago» didn't say what was behind it — the card page's methods are shown.
  it('shows the logos of what the card page takes, not PayPal (it has its own button)', async () => {
    mockCart.cart = cartWithItems();
    mockPaymentMethods.list = [
      { id: 1, name: 'Visa', logoUrl: '/visa.png', sortOrder: 1 },
      { id: 3, name: 'PayPal', logoUrl: '/paypal.png', sortOrder: 3 },
      { id: 5, name: 'Apple Pay', logoUrl: '', sortOrder: 5 },
    ];
    render(<CheckoutPage />);

    const logos = await screen.findByTestId('card-page-logos');
    expect(within(logos).getByAltText('Visa')).toBeInTheDocument();
    expect(within(logos).queryByAltText('PayPal')).not.toBeInTheDocument();
    expect(within(logos).getAllByRole('img')).toHaveLength(1); // no logo uploaded, nothing shown
  });

  it('places a bank-transfer order and shows where to pay', async () => {
    mockCart.cart = cartWithItems();
    mockSettings.bankTransferAvailable = true;
    const order = { orderId: 12, amount: 25, iban: 'ES12', accountHolder: 'TXT', concept: 'Pedido #12', paymentDueAt: '2026-10-26T23:00:00Z' };
    placeBankTransferOrder.mockResolvedValue(order);
    render(<CheckoutPage />);

    fireEvent.click(await screen.findByRole('radio', { name: 'checkout.method.transfer' }));
    const button = screen.getByRole('button', { name: 'checkout.payByTransfer' });
    expect(screen.queryByRole('button', { name: 'checkout.proceed' })).not.toBeInTheDocument(); // one button
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/checkout/success', { state: { bankTransfer: order } }));
    expect(placeBankTransferOrder).toHaveBeenCalledWith(expect.objectContaining({ shippingAddressId: 1 }));
    expect(checkout).not.toHaveBeenCalled();
  });

  it('offers no bank transfer with a gift card applied, or when the shop has it off', async () => {
    mockCart.cart = { ...cartWithItems(), giftCardCode: 'ABCD-EFGH-JKLM', giftCardAvailable: 10, giftCardAmount: 10, amountDue: 10 };
    mockSettings.bankTransferAvailable = true;
    const { unmount } = render(<CheckoutPage />);
    await screen.findByRole('button', { name: 'checkout.proceed' });
    expect(screen.queryByRole('radio', { name: 'checkout.method.transfer' })).not.toBeInTheDocument();
    unmount();

    mockCart.cart = cartWithItems();
    mockSettings.bankTransferAvailable = false;
    render(<CheckoutPage />);
    await screen.findByRole('button', { name: 'checkout.proceed' });
    expect(screen.queryByRole('radio', { name: 'checkout.method.transfer' })).not.toBeInTheDocument();
  });

  // 2026-10-24: one choice and one button, instead of three stacked pay buttons.
  it('picks the payment method first, then shows only that method\'s button', async () => {
    mockCart.cart = cartWithItems();
    mockSettings.bankTransferAvailable = true;
    getPayPalConfig.mockResolvedValue({ enabled: true, clientId: 'CID', environment: 'sandbox', currency: 'EUR' });
    mockPaymentMethods.list = [{ id: 1, name: 'Visa', logoUrl: '/visa.png', sortOrder: 1 }];
    render(<CheckoutPage />);

    // Card by default: its button, and the card page's logos on its option.
    const card = await screen.findByRole('radio', { name: /^checkout.method.card/ });
    expect(card).toBeChecked();
    expect(within(screen.getByTestId('card-page-logos')).getByAltText('Visa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'checkout.proceed' })).toBeInTheDocument();
    expect(screen.queryByTestId('paypal-checkout')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('radio', { name: 'checkout.method.paypal' }));
    expect(screen.getByTestId('paypal-checkout')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'checkout.proceed' })).not.toBeInTheDocument();
    expect(screen.getByText('checkout.method.paypalHint')).toBeInTheDocument();
  });

  it('offers no picker when the card is the only way to pay', async () => {
    mockCart.cart = cartWithItems();
    render(<CheckoutPage />);
    await screen.findByRole('button', { name: 'checkout.proceed' });
    await waitFor(() => expect(getPayPalConfig).toHaveBeenCalled());
    expect(screen.queryByRole('radiogroup', { name: 'checkout.paymentMethod' })).not.toBeInTheDocument();
  });
  // 2026-10-24: invoiced to the shipping address by default; another one only when unticked.
  it('bills to the shipping address unless «Facturar a la misma dirección» is unticked', async () => {
    mockCart.cart = cartWithItems();
    const casa = { id: 1, alias: 'Casa', recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES', isDefault: true };
    const empresa = { id: 2, alias: 'Empresa', recipientName: 'Jane SL', street: 'Calle 2', city: 'Madrid', postalCode: '28002', country: 'ES', isDefault: false };
    getProfile.mockResolvedValue({ ...profile(), addresses: [casa, empresa] });
    checkout.mockResolvedValue(checkoutResponse);
    render(<CheckoutPage />);

    const same = await screen.findByLabelText('checkout.billingSameAsShipping');
    expect(same).toBeChecked();
    expect(screen.queryByLabelText('checkout.billingAddress')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('checkout.shippingAddress'), { target: { value: '2' } });
    const proceed = screen.getByRole('button', { name: 'checkout.proceed' });
    await waitFor(() => expect(proceed).toBeEnabled());
    fireEvent.click(proceed);
    await waitFor(() => expect(checkout).toHaveBeenCalledWith(expect.objectContaining({ shippingAddressId: 2, billingAddressId: 2 })));
  });

  it('unticked, the invoice goes to the address chosen for it', async () => {
    mockCart.cart = cartWithItems();
    const casa = { id: 1, alias: 'Casa', recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES', isDefault: true };
    const empresa = { id: 2, alias: 'Empresa', recipientName: 'Jane SL', street: 'Calle 2', city: 'Madrid', postalCode: '28002', country: 'ES', isDefault: false };
    getProfile.mockResolvedValue({ ...profile(), addresses: [casa, empresa] });
    checkout.mockResolvedValue(checkoutResponse);
    render(<CheckoutPage />);

    fireEvent.click(await screen.findByLabelText('checkout.billingSameAsShipping'));
    fireEvent.change(screen.getByLabelText('checkout.billingAddress'), { target: { value: '2' } });
    const proceed = screen.getByRole('button', { name: 'checkout.proceed' });
    await waitFor(() => expect(proceed).toBeEnabled());
    fireEvent.click(proceed);
    await waitFor(() => expect(checkout).toHaveBeenCalledWith(expect.objectContaining({ shippingAddressId: 1, billingAddressId: 2 })));
  });
  it('says what is missing for free shipping, and that VAT is included', async () => {
    mockCart.cart = cartWithItems();
    getShippingOptions.mockResolvedValue([{ ...validShippingRate, freeShippingThreshold: 60 }]);
    render(<CheckoutPage />);
    expect(await screen.findByText('checkout.missingForFree')).toBeInTheDocument();
    expect(screen.getByText('checkout.vatIncluded · Standard')).toBeInTheDocument();
  });
});
