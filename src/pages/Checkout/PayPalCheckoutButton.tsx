import React, { useEffect, useRef, useState } from 'react';
import { PayPalProvider, PayPalOneTimePaymentButton } from '@paypal/react-paypal-js/sdk-v6';
import { useTranslation } from 'react-i18next';
import {
  cancelPayPalOrder, capturePayPalOrder, createPayPalOrder, getPayPalConfig, type PayPalConfig,
} from '../../services/paypalService';
import { getApiErrorMessage } from '../../utils/apiError';
import type { CheckoutRequest } from '../../types';
import './PayPalCheckoutButton.css';

interface Props {
  // Built at click time, so it carries the address/notes currently selected.
  buildRequest: () => CheckoutRequest;
  disabled: boolean;
  onPaid: () => void;
  onError: (message: string) => void;
  // True while a PayPal attempt is open (window shown / capturing) — the page disables the
  // Redsys button meanwhile, which the backend would reject anyway ("pago en curso").
  onBusyChange?: (busy: boolean) => void;
}

const SDK_LOCALE: Record<string, string> = { es: 'es-ES', ca: 'es-ES', en: 'en-GB' };

// No answer from our server (connection dropped, timeout) or a 5xx: the capture may still have
// gone through, so this is "unknown", not "failed".
const isUnanswered = (err: unknown) => {
  const status = (err as { response?: { status?: number } } | null)?.response?.status;
  return status === undefined || status >= 500;
};

// PayPal inside the storefront: PayPal's own window opens over our page and the customer comes
// back already paid — no redirect to Redsys. Renders nothing unless PayPal is configured.
const PayPalCheckoutButton: React.FC<Props> = ({ buildRequest, disabled, onPaid, onError, onBusyChange }) => {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useState<PayPalConfig | null>(null);
  // The PayPal order of the attempt in progress — onCancel/onError don't receive it.
  const currentOrderId = useRef<string | null>(null);
  // While the capture is in flight the attempt must not be cancelled: the server may be
  // creating the order from that very cart.
  const capturing = useRef(false);
  // createOrder already showed why it failed; PayPal's onError must not replace that message.
  const createFailed = useRef(false);

  useEffect(() => {
    let active = true;
    getPayPalConfig().then(c => { if (active) setConfig(c); }).catch(() => { /* no PayPal button */ });
    return () => { active = false; };
  }, []);

  // Leaving the checkout with PayPal's window still open: unlock the cart, or every payment is
  // refused as "pago en curso" until the in-flight guard expires.
  useEffect(() => () => {
    const id = currentOrderId.current;
    if (id && !capturing.current) cancelPayPalOrder(id).catch(() => { /* expires by itself */ });
  }, []);

  if (!config?.enabled || !config.clientId) return null;

  // Unlock the cart so the customer can retry (any method) right away.
  const releaseAttempt = () => {
    const id = currentOrderId.current;
    currentOrderId.current = null;
    onBusyChange?.(false);
    if (id) cancelPayPalOrder(id).catch(() => { /* the in-flight guard expires by itself */ });
  };

  return (
    <div className="mt-3 paypal-checkout" data-testid="paypal-checkout">
      <div className="text-center text-muted small my-2">{t('checkout.orPayWith')}</div>
      <PayPalProvider
        clientId={config.clientId}
        environment={config.environment}
        components={['paypal-payments']}
        pageType="checkout"
        locale={SDK_LOCALE[i18n.language] ?? 'es-ES'}
      >
        <PayPalOneTimePaymentButton
          disabled={disabled}
          createOrder={async () => {
            createFailed.current = false;
            try {
              onBusyChange?.(true);
              const { payPalOrderId } = await createPayPalOrder(buildRequest());
              currentOrderId.current = payPalOrderId;
              return { orderId: payPalOrderId };
            } catch (err) {
              onBusyChange?.(false);
              createFailed.current = true;
              onError(getApiErrorMessage(err, t('checkout.initError')));
              // Not the axios error itself: unhandled, the global API-error toaster would show
              // the same message a second time.
              throw new Error('PayPal order creation failed');
            }
          }}
          onApprove={async ({ orderId }) => {
            capturing.current = true;
            try {
              // The server's capture is idempotent (an order already created is just returned),
              // so an unanswered call is safe to repeat once.
              const result = await capturePayPalOrder(orderId)
                .catch(err => { if (isUnanswered(err)) return capturePayPalOrder(orderId); throw err; });
              currentOrderId.current = null;
              if (result.restart || !result.orderId) {
                onBusyChange?.(false);
                onError(t('checkout.paypalDeclined'));
                return;
              }
              onPaid();
            } catch (err) {
              currentOrderId.current = null;
              onBusyChange?.(false);
              onError(isUnanswered(err) ? t('checkout.paypalUnconfirmed') : getApiErrorMessage(err, t('checkout.paypalError')));
            } finally {
              capturing.current = false;
            }
          }}
          onCancel={releaseAttempt}
          onError={() => {
            releaseAttempt();
            if (createFailed.current) createFailed.current = false;
            else onError(t('checkout.paypalError'));
          }}
        />
      </PayPalProvider>
    </div>
  );
};

export default PayPalCheckoutButton;
