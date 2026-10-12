import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { CartItem } from '../../../types';
import { parseQuantity, uiLocale } from '../../../utils/locale';

/** The line's metres: typed freely (comma or point) and applied on Enter or when leaving the
 *  field — one request per keystroke disabled the field mid-typing (wanting 12, "1" went out). */
interface Props {
  item: CartItem;
  onCommit: (quantity: number) => void;
  onInvalid: () => void;
  /** 'sm' in the side cart, between its − and + buttons. */
  size?: 'sm';
  disabled?: boolean;
}

const CartQuantityInput: React.FC<Props> = ({ item, onCommit, onInvalid, size, disabled }) => {
  const { t } = useTranslation();
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? new Intl.NumberFormat(uiLocale(), { useGrouping: false, maximumFractionDigits: 2 }).format(item.quantity);
  const commit = () => {
    if (text === null) return;
    const value = parseQuantity(text);
    setText(null);
    if (isNaN(value) || value < item.minQuantity) { onInvalid(); return; }
    if (value !== item.quantity) onCommit(value);
  };
  return (
    <Form.Control
      type="text"
      inputMode="decimal"
      aria-label={t('cart.quantityLabel')}
      value={shown}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
      size={size}
      disabled={disabled}
      className={size === 'sm' ? 'text-center px-1' : undefined}
      style={{ width: size === 'sm' ? 64 : 90 }}
    />
  );
};

export default CartQuantityInput;
