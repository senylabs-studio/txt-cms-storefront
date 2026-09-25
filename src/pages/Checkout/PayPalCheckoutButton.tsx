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
}

const SDK_LOCALE: Record<string, string> = { es: 'es-ES', ca: 'es-ES', en: 'en-GB' };

// PayPal inside the storefront: PayPal's own window opens over our page and the customer comes
// back already paid — no redirect to Redsys. Renders nothing unless PayPal is configured.
const PayPalCheckoutButton: React.FC<Props> = ({ buildRequest, disabled, onPaid, onError }) => {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useState<PayPalConfig | null>(null);
  // The PayPal order of the attempt in progress — onCancel/onError don't receive it.
  const currentOrderId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    getPayPalConfig().then(c => { if (active) setConfig(c); }).catch(() => { /* no PayPal button */ });
    return () => { active = false; };
  }, []);

  if (!config?.enabled || !config.clientId) return null;

  // Unlock the cart so the customer can retry (any method) right away.
  const releaseAttempt = () => {
    const id = currentOrderId.current;
    currentOrderId.current = null;
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
            try {
              const { payPalOrderId } = await createPayPalOrder(buildRequest());
              currentOrderId.current = payPalOrderId;
              return { orderId: payPalOrderId };
            } catch (err) {
              onError(getApiErrorMessage(err, t('checkout.initError')));
              throw err;
            }
          }}
          onApprove={async ({ orderId }) => {
            try {
              const result = await capturePayPalOrder(orderId);
              currentOrderId.current = null;
              if (result.restart || !result.orderId) {
                onError(t('checkout.paypalDeclined'));
                return;
              }
              onPaid();
            } catch (err) {
              currentOrderId.current = null;
              onError(getApiErrorMessage(err, t('checkout.paypalError')));
            }
          }}
          onCancel={releaseAttempt}
          onError={() => {
            releaseAttempt();
            onError(t('checkout.paypalError'));
          }}
        />
      </PayPalProvider>
    </div>
  );
};

export default PayPalCheckoutButton;
