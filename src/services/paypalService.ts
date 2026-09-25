import apiClient from '../apiClient';
import type { CheckoutRequest } from '../types';

// PayPal paid inside the storefront (PayPal JS SDK v6 buttons); the backend creates and
// captures the PayPal order for the server-side total, like it does with Redsys.

export interface PayPalConfig {
  enabled: boolean;
  clientId?: string | null;
  environment: 'sandbox' | 'production';
  currency: string;
}

export interface PayPalCaptureResult {
  orderId?: number | null;
  // PayPal declined the funding source: nothing was charged, the customer can try again.
  restart: boolean;
}

export const getPayPalConfig = async (): Promise<PayPalConfig> =>
  (await apiClient.get('/storefront/checkout/paypal/config')).data;

export const createPayPalOrder = async (data: CheckoutRequest): Promise<{ payPalOrderId: string; amount: number }> =>
  (await apiClient.post('/storefront/checkout/paypal/orders', data)).data;

export const capturePayPalOrder = async (paypalOrderId: string): Promise<PayPalCaptureResult> =>
  (await apiClient.post(`/storefront/checkout/paypal/orders/${encodeURIComponent(paypalOrderId)}/capture`)).data;

export const cancelPayPalOrder = async (paypalOrderId: string): Promise<void> => {
  await apiClient.post(`/storefront/checkout/paypal/orders/${encodeURIComponent(paypalOrderId)}/cancel`);
};
