import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import type { Cart } from '../types';

const mockIsAuthenticated = vi.hoisted(() => ({ value: true }));
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}));

const { getCart, addToCart, updateCartItem, removeCartItem, applyCoupon, removeCoupon } = vi.hoisted(() => ({
  getCart: vi.fn(),
  addToCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  applyCoupon: vi.fn(),
  removeCoupon: vi.fn(),
}));
vi.mock('../services/cartService', () => ({ getCart, addToCart, updateCartItem, removeCartItem, applyCoupon, removeCoupon }));

const cart = (items: Cart['items'] = []): Cart => ({ id: 1, expiresAt: '2099-01-01', items, discountPercent: 0, couponDiscountAmount: 0, recargoEquivalenciaPercent: 0, recargoEquivalenciaAmount: 0, total: 0 });

const Probe: React.FC = () => {
  const { cart: current, loading, drawerOpen, openDrawer, itemCount, fetchCart, addItem, updateItem, removeItem, applyCoupon: applyCouponFn, removeCoupon: removeCouponFn } = useCart();
  const [error, setError] = React.useState('');
  return (
    <div>
      <div data-testid="state">{JSON.stringify({ itemCount, loading, hasCart: current != null, couponCode: current?.couponCode ?? null, drawerOpen })}</div>
      {error && <div data-testid="error">{error}</div>}
      <button onClick={() => fetchCart()}>fetch</button>
      <button onClick={() => openDrawer()}>open-drawer</button>
      <button onClick={() => addItem(undefined, 5, 1).catch(e => setError(e.message))}>add</button>
      <button onClick={() => updateItem(1, 2)}>update</button>
      <button onClick={() => removeItem(1)}>remove</button>
      <button onClick={() => applyCouponFn('SAVE10').catch(e => setError(e.message))}>apply-coupon</button>
      <button onClick={() => removeCouponFn()}>remove-coupon</button>
    </div>
  );
};

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.value = true;
    // CartProvider now fetches on mount (and on every auth transition, matching
    // FavoritesContext's own established pattern) — without a default here, every test would hit
    // an unmocked getCart() as soon as it renders, not just the ones that explicitly care about it.
    getCart.mockResolvedValue(cart([]));
  });

  it('fetches the cart automatically on mount when authenticated', async () => {
    getCart.mockResolvedValue(cart([{ id: 1, productName: 'X', productCode: 'X1', originalUnitPrice: 1, unitPrice: 1, quantity: 1, subtotal: 1, availableStock: 5, minQuantity: 0.3, quantityStep: 0.05 }]));
    render(<CartProvider><Probe /></CartProvider>);

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state).toEqual({ itemCount: 1, loading: false, hasCart: true, couponCode: null, drawerOpen: false });
    });
  });

  it('fetchCart() is a no-op when not authenticated', async () => {
    mockIsAuthenticated.value = false;
    render(<CartProvider><Probe /></CartProvider>);

    fireEvent.click(screen.getByText('fetch'));

    await waitFor(() => expect(getCart).not.toHaveBeenCalled());
  });

  it('fetchCart() clears the cart on failure', async () => {
    getCart.mockRejectedValue(new Error('network error'));
    render(<CartProvider><Probe /></CartProvider>);

    fireEvent.click(screen.getByText('fetch'));

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.hasCart).toBe(false);
    });
  });

  // Regression test: CartContext used to have no logout handling at all — unlike
  // FavoritesContext, which already resets its state to empty when isAuthenticated flips to
  // false — so a previous session's cart (items, prices, totals) stayed in state and kept
  // rendering in the header badge and CartDrawer after logout, with no session backing it
  // anymore. On a shared/kiosk device this leaked one customer's cart contents to whoever used
  // the browser next.
  it('clears the cart and closes the drawer when authentication is lost (logout)', async () => {
    getCart.mockResolvedValue(cart([{ id: 1, productName: 'X', productCode: 'X1', originalUnitPrice: 1, unitPrice: 1, quantity: 1, subtotal: 1, availableStock: 5, minQuantity: 0.3, quantityStep: 0.05 }]));
    const { rerender } = render(<CartProvider><Probe /></CartProvider>);
    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.hasCart).toBe(true);
    });
    fireEvent.click(screen.getByText('open-drawer'));
    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.drawerOpen).toBe(true);
    });

    mockIsAuthenticated.value = false;
    rerender(<CartProvider><Probe /></CartProvider>);

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.hasCart).toBe(false);
      expect(state.drawerOpen).toBe(false);
    });
  });

  it('addItem() updates the cart on success', async () => {
    addToCart.mockResolvedValue(cart([{ id: 9, productName: 'Y', productCode: 'Y1', originalUnitPrice: 2, unitPrice: 2, quantity: 1, subtotal: 2, availableStock: 3, minQuantity: 0.3, quantityStep: 0.05 }]));
    render(<CartProvider><Probe /></CartProvider>);

    fireEvent.click(screen.getByText('add'));

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.itemCount).toBe(1);
    });
    expect(addToCart).toHaveBeenCalledWith({ productId: undefined, variantId: 5, quantity: 1 });
  });

  it('addItem() rejects and leaves the cart untouched on failure, so callers can show an error', async () => {
    addToCart.mockRejectedValue(new Error('out of stock'));
    render(<CartProvider><Probe /></CartProvider>);
    // The provider's own mount-time fetchCart already populated the (empty) cart from the
    // beforeEach default before "add" is even clicked — a failed addItem must leave that as-is,
    // not wipe it back to null.
    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.hasCart).toBe(true);
    });

    fireEvent.click(screen.getByText('add'));

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('out of stock'));
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state.itemCount).toBe(0);
    expect(state.loading).toBe(false);
  });

  it('updateItem() and removeItem() replace the cart with the service response', async () => {
    updateCartItem.mockResolvedValue(cart([{ id: 1, productName: 'Z', productCode: 'Z1', originalUnitPrice: 1, unitPrice: 1, quantity: 2, subtotal: 2, availableStock: 5, minQuantity: 0.3, quantityStep: 0.05 }]));
    removeCartItem.mockResolvedValue(cart([]));
    render(<CartProvider><Probe /></CartProvider>);

    fireEvent.click(screen.getByText('update'));
    await waitFor(() => expect(updateCartItem).toHaveBeenCalledWith(1, 2));

    fireEvent.click(screen.getByText('remove'));
    await waitFor(() => expect(removeCartItem).toHaveBeenCalledWith(1));
  });

  it('applyCoupon() replaces the cart with the service response', async () => {
    applyCoupon.mockResolvedValue({ ...cart([]), couponCode: 'SAVE10', couponDiscountAmount: 5 });
    render(<CartProvider><Probe /></CartProvider>);

    fireEvent.click(screen.getByText('apply-coupon'));

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.couponCode).toBe('SAVE10');
    });
    expect(applyCoupon).toHaveBeenCalledWith('SAVE10');
  });

  it('applyCoupon() rejects and leaves the cart untouched on failure, so callers can show an error', async () => {
    applyCoupon.mockRejectedValue(new Error('Código no válido.'));
    render(<CartProvider><Probe /></CartProvider>);

    fireEvent.click(screen.getByText('apply-coupon'));

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Código no válido.'));
  });

  it('removeCoupon() replaces the cart with the service response', async () => {
    removeCoupon.mockResolvedValue(cart([]));
    render(<CartProvider><Probe /></CartProvider>);

    fireEvent.click(screen.getByText('remove-coupon'));

    await waitFor(() => expect(removeCoupon).toHaveBeenCalled());
  });

  it('useCart throws when used outside a CartProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow('useCart must be used inside CartProvider');
    console.error = consoleError;
  });
});
