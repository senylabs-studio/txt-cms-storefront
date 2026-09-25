import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PayPalCheckoutButton from './PayPalCheckoutButton';

const i18n = vi.hoisted(() => ({ t: (key: string) => key, i18n: { language: 'es' } }));
vi.mock('react-i18next', () => ({ useTranslation: () => i18n }));

const api = vi.hoisted(() => ({
  getPayPalConfig: vi.fn(), createPayPalOrder: vi.fn(), capturePayPalOrder: vi.fn(), cancelPayPalOrder: vi.fn(),
}));
vi.mock('../../services/paypalService', () => api);

// Stand-in for PayPal's SDK: buttons that drive the same callbacks PayPal's window would.
type ButtonProps = {
  createOrder: () => Promise<{ orderId: string }>;
  onApprove: (data: { orderId: string }) => Promise<void>;
  onCancel: () => void;
  onError: (e: unknown) => void;
  disabled?: boolean;
};
vi.mock('@paypal/react-paypal-js/sdk-v6', () => ({
  PayPalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PayPalOneTimePaymentButton: (props: ButtonProps) => {
    const [orderId, setOrderId] = React.useState('');
    return (
      <div>
        <button disabled={props.disabled} onClick={async () => setOrderId((await props.createOrder().catch(() => ({ orderId: '' }))).orderId)}>create</button>
        <button onClick={() => props.onApprove({ orderId })}>approve</button>
        <button onClick={() => props.onCancel()}>cancel</button>
      </div>
    );
  },
}));

const setup = () => {
  const onPaid = vi.fn();
  const onError = vi.fn();
  render(<PayPalCheckoutButton buildRequest={() => ({ shippingAddressId: 7 })} disabled={false} onPaid={onPaid} onError={onError} />);
  return { onPaid, onError };
};

describe('PayPalCheckoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getPayPalConfig.mockResolvedValue({ enabled: true, clientId: 'CID', environment: 'sandbox', currency: 'EUR' });
    api.createPayPalOrder.mockResolvedValue({ payPalOrderId: 'PP-1', amount: 45.9 });
    api.cancelPayPalOrder.mockResolvedValue(undefined);
  });

  it('renders nothing when PayPal is not configured', async () => {
    api.getPayPalConfig.mockResolvedValue({ enabled: false, environment: 'sandbox', currency: 'EUR' });
    setup();
    await waitFor(() => expect(api.getPayPalConfig).toHaveBeenCalled());
    expect(screen.queryByTestId('paypal-checkout')).toBeNull();
  });

  it('creates the order from the checkout form, captures it and reports the payment', async () => {
    api.capturePayPalOrder.mockResolvedValue({ orderId: 12, restart: false });
    const { onPaid, onError } = setup();

    fireEvent.click(await screen.findByText('create'));
    await waitFor(() => expect(api.createPayPalOrder).toHaveBeenCalledWith({ shippingAddressId: 7 }));
    fireEvent.click(screen.getByText('approve'));

    await waitFor(() => expect(onPaid).toHaveBeenCalled());
    expect(api.capturePayPalOrder).toHaveBeenCalledWith('PP-1');
    expect(onError).not.toHaveBeenCalled();
  });

  it('asks to retry when PayPal declines the funding source', async () => {
    api.capturePayPalOrder.mockResolvedValue({ orderId: null, restart: true });
    const { onPaid, onError } = setup();

    fireEvent.click(await screen.findByText('create'));
    await waitFor(() => expect(api.createPayPalOrder).toHaveBeenCalled());
    fireEvent.click(screen.getByText('approve'));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('checkout.paypalDeclined'));
    expect(onPaid).not.toHaveBeenCalled();
  });

  it('reports busy while a PayPal attempt is open, and idle once it is closed', async () => {
    const onBusyChange = vi.fn();
    render(<PayPalCheckoutButton buildRequest={() => ({ shippingAddressId: 7 })} disabled={false} onPaid={vi.fn()} onError={vi.fn()} onBusyChange={onBusyChange} />);

    fireEvent.click(await screen.findByText('create'));
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true));
    fireEvent.click(screen.getByText('cancel'));

    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it('releases the cart when the customer closes PayPal without paying', async () => {
    setup();

    fireEvent.click(await screen.findByText('create'));
    await waitFor(() => expect(api.createPayPalOrder).toHaveBeenCalled());
    fireEvent.click(screen.getByText('cancel'));

    await waitFor(() => expect(api.cancelPayPalOrder).toHaveBeenCalledWith('PP-1'));
  });

  it('shows the backend message when the order cannot be created', async () => {
    api.createPayPalOrder.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Stock insuficiente para: Lino' } } });
    const { onError } = setup();

    fireEvent.click(await screen.findByText('create'));

    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});
