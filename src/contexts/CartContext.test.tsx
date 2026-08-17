import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import type { Cart } from '../types';

const mockIsAuthenticated = vi.hoisted(() => ({ value: true }));
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}));

const { getCart, addToCart, updateCartItem, removeCartItem } = vi.hoisted(() => ({
  getCart: vi.fn(),
  addToCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
}));
vi.mock('../services/cartService', () => ({ getCart, addToCart, updateCartItem, removeCartItem }));

const cart = (items: Cart['items'] = []): Cart => ({ id: 1, expiresAt: '2099-01-01', items, discountPercent: 0, total: 0 });

const Probe: React.FC = () => {
  const { cart: current, loading, itemCount, fetchCart, addItem, updateItem, removeItem } = useCart();
  const [error, setError] = React.useState('');
  return (
    <div>
      <div data-testid="state">{JSON.stringify({ itemCount, loading, hasCart: current != null })}</div>
      {error && <div data-testid="error">{error}</div>}
      <button onClick={() => fetchCart()}>fetch</button>
      <button onClick={() => addItem(undefined, 5, 1).catch(e => setError(e.message))}>add</button>
      <button onClick={() => updateItem(1, 2)}>update</button>
      <button onClick={() => removeItem(1)}>remove</button>
    </div>
  );
};

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.value = true;
  });

  it('fetchCart() populates the cart when authenticated', async () => {
    getCart.mockResolvedValue(cart([{ id: 1, productName: 'X', productCode: 'X1', originalUnitPrice: 1, unitPrice: 1, quantity: 1, subtotal: 1, availableStock: 5 }]));
    render(<CartProvider><Probe /></CartProvider>);

    fireEvent.click(screen.getByText('fetch'));

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state).toEqual({ itemCount: 1, loading: false, hasCart: true });
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

  it('addItem() updates the cart on success', async () => {
    addToCart.mockResolvedValue(cart([{ id: 9, productName: 'Y', productCode: 'Y1', originalUnitPrice: 2, unitPrice: 2, quantity: 1, subtotal: 2, availableStock: 3 }]));
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

    fireEvent.click(screen.getByText('add'));

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('out of stock'));
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state.hasCart).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('updateItem() and removeItem() replace the cart with the service response', async () => {
    updateCartItem.mockResolvedValue(cart([{ id: 1, productName: 'Z', productCode: 'Z1', originalUnitPrice: 1, unitPrice: 1, quantity: 2, subtotal: 2, availableStock: 5 }]));
    removeCartItem.mockResolvedValue(cart([]));
    render(<CartProvider><Probe /></CartProvider>);

    fireEvent.click(screen.getByText('update'));
    await waitFor(() => expect(updateCartItem).toHaveBeenCalledWith(1, 2));

    fireEvent.click(screen.getByText('remove'));
    await waitFor(() => expect(removeCartItem).toHaveBeenCalledWith(1));
  });

  it('useCart throws when used outside a CartProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow('useCart must be used inside CartProvider');
    console.error = consoleError;
  });
});
