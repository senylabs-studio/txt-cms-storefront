import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrdersPage from './OrdersPage';
import type { StorefrontOrder, PaginatedResponse } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key }),
}));

vi.mock('../../components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const { getOrders } = vi.hoisted(() => ({ getOrders: vi.fn() }));
vi.mock('../../services/profileService', () => ({ getOrders }));

const renderOrders = () => render(<OrdersPage />, { wrapper: MemoryRouter });

const page = (items: StorefrontOrder[], totalPages = 1, currentPage = 1): PaginatedResponse<StorefrontOrder> => ({
  items, totalItems: items.length, totalPages, currentPage, pageSize: 10,
});

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates back to /account', async () => {
    getOrders.mockResolvedValue(page([]));
    renderOrders();

    fireEvent.click(screen.getByText('orders.backToAccount'));
    expect(navigate).toHaveBeenCalledWith('/account');
  });

  it('shows an empty state and navigates to /catalog from it', async () => {
    getOrders.mockResolvedValue(page([]));
    renderOrders();

    expect(await screen.findByText('orders.noOrders')).toBeInTheDocument();
    fireEvent.click(screen.getByText('orders.browseCatalog'));
    expect(navigate).toHaveBeenCalledWith('/catalog');
  });

  it('renders the order rows with status and total', async () => {
    getOrders.mockResolvedValue(page([
      { id: 42, status: 'Paid', total: 99.5, createdAt: '2026-01-15T00:00:00.000Z' },
    ]));
    renderOrders();

    expect(await screen.findByText('#42')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('€99.50')).toBeInTheDocument();
  });

  it('links each row to its order detail page', async () => {
    getOrders.mockResolvedValue(page([
      { id: 42, status: 'Paid', total: 99.5, createdAt: '2026-01-15T00:00:00.000Z' },
    ]));
    renderOrders();

    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', '/account/orders/42');
  });

  it('paginates: changing page re-fetches with the new page number', async () => {
    getOrders.mockResolvedValueOnce(page([
      { id: 1, status: 'Paid', total: 10, createdAt: '2026-01-01T00:00:00.000Z' },
    ], 2, 1)).mockResolvedValueOnce(page([
      { id: 2, status: 'Paid', total: 20, createdAt: '2026-01-02T00:00:00.000Z' },
    ], 2, 2));
    renderOrders();

    await screen.findByText('#1');
    fireEvent.click(screen.getByText('2'));

    await waitFor(() => expect(getOrders).toHaveBeenCalledWith(2, 10));
    expect(await screen.findByText('#2')).toBeInTheDocument();
  });

  it('does not render pagination controls when there is only one page', async () => {
    getOrders.mockResolvedValue(page([
      { id: 1, status: 'Paid', total: 10, createdAt: '2026-01-01T00:00:00.000Z' },
    ], 1, 1));
    renderOrders();

    await screen.findByText('#1');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
