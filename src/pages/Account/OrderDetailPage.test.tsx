import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrderDetailPage from './OrderDetailPage';
import type { StorefrontOrderDetail } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { defaultValue?: string; id?: number }) => opts?.defaultValue ?? key }),
}));

vi.mock('../../components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const { getOrderDetail, downloadOrderInvoice, cancelOrder } = vi.hoisted(() => ({
  getOrderDetail: vi.fn(),
  downloadOrderInvoice: vi.fn(),
  cancelOrder: vi.fn(),
}));
vi.mock('../../services/profileService', () => ({ getOrderDetail, downloadOrderInvoice, cancelOrder }));

const renderDetail = (id = '42') => render(
  <MemoryRouter initialEntries={[`/account/orders/${id}`]}>
    <Routes>
      <Route path="/account/orders/:id" element={<OrderDetailPage />} />
    </Routes>
  </MemoryRouter>,
);

const order = (overrides: Partial<StorefrontOrderDetail> = {}): StorefrontOrderDetail => ({
  id: 42,
  status: 'Paid',
  total: 21,
  shippingCost: 0,
  createdAt: '2026-01-15T00:00:00.000Z',
  lines: [
    { productName: 'Tela azul', productCode: 'TA1', unitPrice: 10, discountPercent: 0, quantity: 2, subtotal: 20 },
  ],
  ...overrides,
});

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the order by id from the route params', async () => {
    getOrderDetail.mockResolvedValue(order());
    renderDetail();

    await waitFor(() => expect(getOrderDetail).toHaveBeenCalledWith(42));
  });

  it('renders order status, lines, and totals once loaded', async () => {
    getOrderDetail.mockResolvedValue(order());
    renderDetail();

    expect(await screen.findByText('Tela azul')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('€21.00')).toBeInTheDocument();
    expect(screen.getByText('orderDetail.free')).toBeInTheDocument();
  });

  it('renders the shipping address block only when present', async () => {
    getOrderDetail.mockResolvedValue(order({
      shippingAddress: { recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES' },
    }));
    renderDetail();

    expect(await screen.findByText('Jane')).toBeInTheDocument();
  });

  it('omits the shipping address block when absent', async () => {
    getOrderDetail.mockResolvedValue(order());
    renderDetail();

    await screen.findByText('Tela azul');
    expect(screen.queryByText('orderDetail.shippingAddress')).not.toBeInTheDocument();
  });

  it('shows a non-zero shipping cost when present', async () => {
    getOrderDetail.mockResolvedValue(order({ shippingCost: 5, total: 26 }));
    renderDetail();

    await screen.findByText('Tela azul');
    expect(screen.getByText('€5.00')).toBeInTheDocument();
  });

  it('navigates back to /account/orders on failure', async () => {
    getOrderDetail.mockRejectedValue(new Error('not found'));
    renderDetail();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/account/orders'));
  });

  it('navigates back to /account/orders via the back button', async () => {
    getOrderDetail.mockResolvedValue(order());
    renderDetail();

    fireEvent.click(await screen.findByText('orderDetail.backToOrders'));
    expect(navigate).toHaveBeenCalledWith('/account/orders');
  });

  it('shows a download-invoice button for a paid order and downloads on click', async () => {
    getOrderDetail.mockResolvedValue(order({ status: 'Paid' }));
    downloadOrderInvoice.mockResolvedValue(undefined);
    renderDetail();

    fireEvent.click(await screen.findByText('orderDetail.downloadInvoice'));
    await waitFor(() => expect(downloadOrderInvoice).toHaveBeenCalledWith(42));
  });

  it('hides the download-invoice button for a pending-payment order', async () => {
    getOrderDetail.mockResolvedValue(order({ status: 'PendingPayment' }));
    renderDetail();

    await screen.findByText('Tela azul');
    expect(screen.queryByText('orderDetail.downloadInvoice')).not.toBeInTheDocument();
  });

  it('hides the download-invoice button for a cancelled order', async () => {
    getOrderDetail.mockResolvedValue(order({ status: 'Cancelled' }));
    renderDetail();

    await screen.findByText('Tela azul');
    expect(screen.queryByText('orderDetail.downloadInvoice')).not.toBeInTheDocument();
  });

  it('shows a cancel button for a paid order and cancels after confirming', async () => {
    getOrderDetail.mockResolvedValueOnce(order({ status: 'Paid' })).mockResolvedValueOnce(order({ status: 'Cancelled' }));
    cancelOrder.mockResolvedValue(undefined);
    renderDetail();

    fireEvent.click(await screen.findByText('orderDetail.cancelOrder'));
    fireEvent.click(await screen.findByText('orderDetail.confirmCancelButton'));

    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith(42));
    await waitFor(() => expect(getOrderDetail).toHaveBeenCalledTimes(2));
  });

  it('hides the cancel button once the order has shipped', async () => {
    getOrderDetail.mockResolvedValue(order({ status: 'Shipped' }));
    renderDetail();

    await screen.findByText('Tela azul');
    expect(screen.queryByText('orderDetail.cancelOrder')).not.toBeInTheDocument();
  });

  it('shows the tracking number when present', async () => {
    getOrderDetail.mockResolvedValue(order({ status: 'Shipped', trackingNumber: 'ES123456789' }));
    renderDetail();

    expect(await screen.findByText(/ES123456789/)).toBeInTheDocument();
  });
});
