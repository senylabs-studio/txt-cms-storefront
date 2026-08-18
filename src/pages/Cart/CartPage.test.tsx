import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CartPage from './CartPage';
import type { Cart } from '../../types';

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

const mockCart = vi.hoisted(() => ({
  cart: null as Cart | null,
  loading: false,
  fetchCart: vi.fn(),
  updateItem: vi.fn(),
  removeItem: vi.fn(),
}));
vi.mock('../../contexts/CartContext', () => ({
  useCart: () => mockCart,
}));

const cartWithItems = (overrides: Partial<Cart> = {}): Cart => ({
  id: 1,
  expiresAt: '2099-01-01T00:00:00.000Z',
  discountPercent: 0,
  total: 20,
  items: [
    { id: 1, productName: 'Tela azul', productCode: 'TA1', originalUnitPrice: 10, unitPrice: 10, quantity: 2, subtotal: 20, availableStock: 5 },
  ],
  ...overrides,
});

describe('CartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockCart.cart = null;
    mockCart.loading = false;
  });

  it('shows a login prompt and does not fetch the cart when not authenticated', () => {
    mockAuth.isAuthenticated = false;
    render(<CartPage />);

    expect(screen.getByText('cart.loginRequired')).toBeInTheDocument();
    expect(mockCart.fetchCart).not.toHaveBeenCalled();
  });

  it('navigates to /login from the login prompt', () => {
    mockAuth.isAuthenticated = false;
    render(<CartPage />);

    fireEvent.click(screen.getByText('header.login'));
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('fetches the cart on mount when authenticated', () => {
    render(<CartPage />);
    expect(mockCart.fetchCart).toHaveBeenCalled();
  });

  it('shows an empty-cart message and navigates to /catalog from it', () => {
    mockCart.cart = { id: 1, expiresAt: '2099-01-01T00:00:00.000Z', discountPercent: 0, total: 0, items: [] };
    render(<CartPage />);

    expect(screen.getByText('cart.empty')).toBeInTheDocument();
    fireEvent.click(screen.getByText('cart.browseCatalog'));
    expect(navigate).toHaveBeenCalledWith('/catalog');
  });

  it('renders cart items, the discount line, and the total', () => {
    mockCart.cart = cartWithItems({ discountPercent: 10, total: 18 });
    render(<CartPage />);

    expect(screen.getByText('Tela azul')).toBeInTheDocument();
    expect(screen.getByText('cart.discount')).toBeInTheDocument();
    expect(screen.getByText('€18.00')).toBeInTheDocument();
  });

  it('navigates to /checkout when the checkout button is clicked', () => {
    mockCart.cart = cartWithItems();
    render(<CartPage />);

    fireEvent.click(screen.getByText('cart.checkout'));
    expect(navigate).toHaveBeenCalledWith('/checkout');
  });

  it('changing the quantity input calls updateItem with the parsed value', () => {
    mockCart.cart = cartWithItems();
    render(<CartPage />);

    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '3' } });
    expect(mockCart.updateItem).toHaveBeenCalledWith(1, 3);
  });

  it('shows the backend error message when updateItem rejects with an axios error', async () => {
    mockCart.cart = cartWithItems();
    mockCart.updateItem.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Stock insuficiente' } } });
    render(<CartPage />);

    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '3' } });

    expect(await screen.findByText('Stock insuficiente')).toBeInTheDocument();
  });

  it('shows a generic error message when updateItem rejects without axios details', async () => {
    mockCart.cart = cartWithItems();
    mockCart.updateItem.mockRejectedValue(new Error('boom'));
    render(<CartPage />);

    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '3' } });

    expect(await screen.findByText('cart.updateError')).toBeInTheDocument();
  });

  it('shows an error message when removeItem rejects, and it can be dismissed', async () => {
    mockCart.cart = cartWithItems();
    mockCart.removeItem.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'No se pudo eliminar' } } });
    render(<CartPage />);

    fireEvent.click(screen.getByRole('button', { name: '' }));

    const alert = await screen.findByText('No se pudo eliminar');
    expect(alert).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close alert' }));
    await waitFor(() => expect(screen.queryByText('No se pudo eliminar')).not.toBeInTheDocument());
  });

  it('shows an expired countdown with a refresh button that calls fetchCart', async () => {
    mockCart.cart = cartWithItems({ expiresAt: '2000-01-01T00:00:00.000Z' });
    render(<CartPage />);

    const refreshBtn = await screen.findByText('cart.refresh');
    fireEvent.click(refreshBtn);
    expect(mockCart.fetchCart).toHaveBeenCalledTimes(2);
  });
});
