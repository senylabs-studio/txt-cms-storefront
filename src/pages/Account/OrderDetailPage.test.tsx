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

const { getOrderDetail, downloadOrderInvoice, cancelOrder, requestReturn } = vi.hoisted(() => ({
  getOrderDetail: vi.fn(),
  downloadOrderInvoice: vi.fn(),
  cancelOrder: vi.fn(),
  requestReturn: vi.fn(),
}));
vi.mock('../../services/profileService', () => ({ getOrderDetail, downloadOrderInvoice, cancelOrder, requestReturn }));

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

  it('shows a cancel button for a paid order and cancels after confirming with no reason', async () => {
    getOrderDetail.mockResolvedValueOnce(order({ status: 'Paid' })).mockResolvedValueOnce(order({ status: 'Cancelled' }));
    cancelOrder.mockResolvedValue(undefined);
    renderDetail();

    fireEvent.click(await screen.findByText('orderDetail.cancelOrder'));
    fireEvent.click(await screen.findByText('orderDetail.confirmCancelButton'));

    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith(42, undefined));
    await waitFor(() => expect(getOrderDetail).toHaveBeenCalledTimes(2));
  });

  it('passes the typed reason through when cancelling', async () => {
    getOrderDetail.mockResolvedValueOnce(order({ status: 'Paid' })).mockResolvedValueOnce(order({ status: 'Cancelled' }));
    cancelOrder.mockResolvedValue(undefined);
    renderDetail();

    fireEvent.click(await screen.findByText('orderDetail.cancelOrder'));
    fireEvent.change(screen.getByPlaceholderText('orderDetail.cancelReasonPlaceholder'), { target: { value: 'Encontré mejor precio' } });
    fireEvent.click(screen.getByText('orderDetail.confirmCancelButton'));

    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith(42, 'Encontré mejor precio'));
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

  it('shows a request-return button for a delivered order and submits a reason', async () => {
    getOrderDetail
      .mockResolvedValueOnce(order({ status: 'Delivered' }))
      .mockResolvedValueOnce(order({ status: 'Delivered', returnRequestedAt: '2026-08-20T00:00:00.000Z' }));
    requestReturn.mockResolvedValue(undefined);
    renderDetail();

    fireEvent.click(await screen.findByText('orderDetail.requestReturn'));
    fireEvent.change(screen.getByPlaceholderText('orderDetail.returnReasonPlaceholder'), { target: { value: 'Talla incorrecta' } });
    fireEvent.click(screen.getByText('orderDetail.confirmReturnButton'));

    await waitFor(() => expect(requestReturn).toHaveBeenCalledWith(42, 'Talla incorrecta'));
    await waitFor(() => expect(getOrderDetail).toHaveBeenCalledTimes(2));
  });

  it('hides the request-return button once a return has already been requested, and shows the notice', async () => {
    getOrderDetail.mockResolvedValue(order({ status: 'Delivered', returnRequestedAt: '2026-08-20T00:00:00.000Z' }));
    renderDetail();

    await screen.findByText('Tela azul');
    expect(screen.queryByText('orderDetail.requestReturn')).not.toBeInTheDocument();
    expect(screen.getByText('orderDetail.returnRequested')).toBeInTheDocument();
  });

  it('hides the request-return button for a non-delivered order', async () => {
    getOrderDetail.mockResolvedValue(order({ status: 'Shipped' }));
    renderDetail();

    await screen.findByText('Tela azul');
    expect(screen.queryByText('orderDetail.requestReturn')).not.toBeInTheDocument();
  });

  it('shows an error message when requestReturn fails', async () => {
    getOrderDetail.mockResolvedValue(order({ status: 'Delivered' }));
    requestReturn.mockRejectedValue(new Error('boom'));
    renderDetail();

    fireEvent.click(await screen.findByText('orderDetail.requestReturn'));
    fireEvent.click(screen.getByText('orderDetail.confirmReturnButton'));

    expect(await screen.findByText('orderDetail.returnError')).toBeInTheDocument();
  });

  it('shows a leave-a-review link for a delivered order line with a variant', async () => {
    getOrderDetail.mockResolvedValue(order({
      status: 'Delivered',
      lines: [{ productName: 'Tela azul', productCode: 'TA1', unitPrice: 10, discountPercent: 0, quantity: 2, subtotal: 20, variantId: 7 }],
    }));
    renderDetail();

    const link = await screen.findByText('orderDetail.leaveReview');
    expect(link.closest('a')).toHaveAttribute('href', '/variant/7#reviews');
  });

  it('hides the leave-a-review link for a non-delivered order', async () => {
    getOrderDetail.mockResolvedValue(order({
      status: 'Shipped',
      lines: [{ productName: 'Tela azul', productCode: 'TA1', unitPrice: 10, discountPercent: 0, quantity: 2, subtotal: 20, variantId: 7 }],
    }));
    renderDetail();

    await screen.findByText('Tela azul');
    expect(screen.queryByText('orderDetail.leaveReview')).not.toBeInTheDocument();
  });

  it('hides the leave-a-review link for a line with no variant (synthetic or non-variant purchase)', async () => {
    getOrderDetail.mockResolvedValue(order({ status: 'Delivered' })); // default line has no variantId
    renderDetail();

    await screen.findByText('Tela azul');
    expect(screen.queryByText('orderDetail.leaveReview')).not.toBeInTheDocument();
  });
});
