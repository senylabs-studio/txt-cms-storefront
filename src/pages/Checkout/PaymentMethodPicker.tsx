import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaUniversity } from 'react-icons/fa';
import './PaymentMethodPicker.css';

export type CheckoutPaymentMethod = 'card' | 'paypal' | 'transfer';

interface Props {
  methods: CheckoutPaymentMethod[];
  value: CheckoutPaymentMethod;
  onChange: (method: CheckoutPaymentMethod) => void;
  disabled: boolean;
  // What the card page (Redsys) takes: cards and wallets, as uploaded in the CMS.
  cardLogos: { id: number; name: string; logoUrl: string }[];
}

// One choice, one button below it (2026-10-24): three stacked pay buttons of different weight
// made the card look like the only real option and left the transfer's terms hanging under it.
const PaymentMethodPicker: React.FC<Props> = ({ methods, value, onChange, disabled, cardLogos }) => {
  const { t } = useTranslation();

  const badge = (method: CheckoutPaymentMethod) => {
    if (method === 'card') return cardLogos.length > 0 && (
      <span className="payment-option-logos" data-testid="card-page-logos">
        {cardLogos.map(m => <img key={m.id} src={m.logoUrl} alt={m.name} title={m.name} />)}
      </span>
    );
    if (method === 'paypal') return <span className="payment-option-paypal" aria-hidden><span>Pay</span><span>Pal</span></span>;
    return <FaUniversity className="text-secondary" size={20} aria-hidden />;
  };

  return (
    <div className="payment-options" role="radiogroup" aria-label={t('checkout.paymentMethod')}>
      {methods.map(method => {
        const selected = method === value;
        return (
          <label key={method} className={`payment-option${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}>
            <span className="payment-option-row">
              <input
                type="radio"
                className="form-check-input mt-0"
                name="payment-method"
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(method)}
              />
              <span className="payment-option-name">{t(`checkout.method.${method}`)}</span>
              {badge(method)}
            </span>
            {selected && <span className="payment-option-hint">{t(`checkout.method.${method}Hint`)}</span>}
          </label>
        );
      })}
    </div>
  );
};

export default PaymentMethodPicker;
