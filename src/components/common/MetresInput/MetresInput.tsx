import React, { useState } from 'react';
import { uiLocale, parseQuantity } from '../../../utils/locale';

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

interface Props extends InputProps {
  value: number;
  min: number;
  onValue: (value: number) => void;
}

/** Metres typed freely ("1,5" or "1.5"). While typing, a valid amount (≥ min) is taken; on leaving
 *  the field anything else goes back to the amount in use — the field never shows one quantity
 *  while another is added to the cart (a number input kept "0.8" or a rejected "1,5" on screen). */
const MetresInput: React.FC<Props> = ({ value, min, onValue, onBlur, ...rest }) => {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? new Intl.NumberFormat(uiLocale(), { useGrouping: false, maximumFractionDigits: 2 }).format(value);
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={shown}
      onChange={e => {
        setText(e.target.value);
        const v = parseQuantity(e.target.value);
        if (!isNaN(v) && v >= min) onValue(Math.round(v * 100) / 100);
      }}
      onBlur={e => { setText(null); onBlur?.(e); }}
    />
  );
};

export default MetresInput;
