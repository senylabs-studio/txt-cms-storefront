import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartDrawer from './CartDrawer';
import type { Cart } from '../../../types';

const renderDrawer = () => render(<CartDrawer />, { wrapper: MemoryRouter });

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const mockCart = vi.hoisted(() => ({
  cart: null as Cart | null,
  drawerOpen: true,
  closeDrawer: vi.fn(),
  updateItem: vi.fn(),
  removeItem: vi.fn(),
  loading: false,
}));
vi.mock('../../../contexts/CartContext', () => ({
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

describe('CartDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCart.cart = null;
    mockCart.drawerOpen = true;
    mockCart.loading = false;

    // react-bootstrap's Offcanvas checks the viewport via matchMedia, which jsdom doesn't implement.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('shows an empty-cart message and navigates to /catalog while closing the drawer', () => {
    mockCart.cart = { id: 1, expiresAt: '2099-01-01T00:00:00.000Z', discountPercent: 0, total: 0, items: [] };
    renderDrawer();

    fireEvent.click(screen.getByText('cart.browseCatalog'));
    expect(mockCart.closeDrawer).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/catalog');
  });

  it('renders cart items and the total', () => {
    mockCart.cart = cartWithItems();
    renderDrawer();

    expect(screen.getByText('Tela azul')).toBeInTheDocument();
    expect(screen.getAllByText('€20.00')).toHaveLength(2);
  });

  it('the plus/minus buttons call updateItem with quantity +/- 1', () => {
    mockCart.cart = cartWithItems();
    renderDrawer();

    const [minusBtn, plusBtn] = screen.getAllByRole('button', { name: '' }).slice(0, 2);
    fireEvent.click(plusBtn);
    expect(mockCart.updateItem).toHaveBeenCalledWith(1, 3);

    fireEvent.click(minusBtn);
    expect(mockCart.updateItem).toHaveBeenCalledWith(1, 1);
  });

  it('disables the plus button once quantity reaches availableStock', () => {
    mockCart.cart = cartWithItems({ items: [{ id: 1, productName: 'Tela azul', productCode: 'TA1', originalUnitPrice: 10, unitPrice: 10, quantity: 5, subtotal: 50, availableStock: 5 }] });
    renderDrawer();

    const buttons = screen.getAllByRole('button', { name: '' });
    const plusBtn = buttons[1];
    expect(plusBtn).toBeDisabled();
  });

  it('shows the backend error message when updateItem rejects with an axios error', async () => {
    mockCart.cart = cartWithItems();
    mockCart.updateItem.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Stock insuficiente' } } });
    renderDrawer();

    const [, plusBtn] = screen.getAllByRole('button', { name: '' });
    fireEvent.click(plusBtn);

    expect(await screen.findByText('Stock insuficiente')).toBeInTheDocument();
  });

  it('shows a generic error message when removeItem rejects without axios details', async () => {
    mockCart.cart = cartWithItems();
    mockCart.removeItem.mockRejectedValue(new Error('boom'));
    renderDrawer();

    const buttons = screen.getAllByRole('button', { name: '' });
    const removeBtn = buttons[buttons.length - 1];
    fireEvent.click(removeBtn);

    expect(await screen.findByText('cart.removeError')).toBeInTheDocument();
  });

  it('clears any item error when the drawer is reopened', async () => {
    mockCart.cart = cartWithItems();
    mockCart.removeItem.mockRejectedValue(new Error('boom'));
    const { rerender } = renderDrawer();

    const buttons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(await screen.findByText('cart.removeError')).toBeInTheDocument();

    mockCart.drawerOpen = false;
    rerender(<CartDrawer />);
    mockCart.drawerOpen = true;
    rerender(<CartDrawer />);

    await waitFor(() => expect(screen.queryByText('cart.removeError')).not.toBeInTheDocument());
  });

  it('navigates to /checkout while closing the drawer', () => {
    mockCart.cart = cartWithItems();
    renderDrawer();

    fireEvent.click(screen.getByText('cart.checkout'));
    expect(mockCart.closeDrawer).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/checkout');
  });
});
