import React, { useId, useState } from 'react';
import { Form, InputGroup, Button, OverlayTrigger, Tooltip, type FormControlProps } from 'react-bootstrap';
import { FaEye, FaEyeSlash, FaInfoCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import IconTooltip from '../IconTooltip/IconTooltip';
import './PasswordInput.css';

type Props = Omit<FormControlProps, 'type' | 'as'>
  & Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof FormControlProps | 'type'> & {
  /** Validation message. It goes inside the group: a Form.Control.Feedback placed after the
   *  component would no longer be the input's sibling, and Bootstrap would keep it hidden. */
  feedback?: React.ReactNode;
  /** Field where a new password is chosen: adds an info button listing the rules of
   *  meetsPasswordRules (utils/password.ts), so they're known before the first failed submit. */
  showRules?: boolean;
};

const RULE_KEYS = ['minLength', 'uppercase', 'lowercase', 'digit', 'symbol'] as const;

/** Password field with an eye button to show what was typed (a long password typed blind on a
 *  phone is easy to get wrong). */
const PasswordInput: React.FC<Props> = ({ feedback, showRules, ...controlProps }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const rulesId = useId();
  const label = visible ? t('auth.hidePassword') : t('auth.showPassword');
  const describedBy = [controlProps['aria-describedby'], showRules ? rulesId : undefined].filter(Boolean).join(' ') || undefined;
  return (
    <InputGroup hasValidation>
      <Form.Control {...controlProps} aria-describedby={describedBy} type={visible ? 'text' : 'password'} />
      {showRules && (
        <>
          {/* Screen readers get the rules with the field itself, not only on the button. */}
          <span id={rulesId} className="visually-hidden">{t('auth.register.passwordHint')}</span>
          <OverlayTrigger
            placement="top"
            delay={{ show: 150, hide: 0 }}
            overlay={(
              <Tooltip className="password-rules-tooltip">
                <div className="fw-semibold mb-1">{t('auth.passwordRules.title')}</div>
                <ul className="mb-0 ps-3">
                  {RULE_KEYS.map(k => <li key={k}>{t(`auth.passwordRules.${k}`)}</li>)}
                </ul>
              </Tooltip>
            )}
          >
            <Button
              type="button"
              variant="outline-secondary"
              className="password-input-toggle"
              aria-label={t('auth.passwordRules.info')}
            >
              <FaInfoCircle />
            </Button>
          </OverlayTrigger>
        </>
      )}
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
