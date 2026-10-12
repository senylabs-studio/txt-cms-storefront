import React, { useState } from 'react';
import { Form, InputGroup, Button, type FormControlProps } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import IconTooltip from '../IconTooltip/IconTooltip';
import './PasswordInput.css';

type Props = Omit<FormControlProps, 'type' | 'as'>
  & Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof FormControlProps | 'type'> & {
  /** Validation message. It goes inside the group: a Form.Control.Feedback placed after the
   *  component would no longer be the input's sibling, and Bootstrap would keep it hidden. */
  feedback?: React.ReactNode;
};

/** Password field with an eye button to show what was typed (a long password typed blind on a
 *  phone is easy to get wrong). */
const PasswordInput: React.FC<Props> = ({ feedback, ...controlProps }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const label = visible ? t('auth.hidePassword') : t('auth.showPassword');
  return (
    <InputGroup hasValidation>
      <Form.Control {...controlProps} type={visible ? 'text' : 'password'} />
      <IconTooltip label={label}>
        <Button
          type="button"
          variant="outline-secondary"
          className="password-input-toggle"
          aria-label={label}
          aria-pressed={visible}
          onClick={() => setVisible(v => !v)}
        >
          {visible ? <FaEyeSlash /> : <FaEye />}
        </Button>
      </IconTooltip>
      {feedback && <Form.Control.Feedback type="invalid">{feedback}</Form.Control.Feedback>}
    </InputGroup>
  );
};

export default PasswordInput;
