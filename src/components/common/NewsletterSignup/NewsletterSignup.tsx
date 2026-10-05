import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaEnvelopeOpenText } from 'react-icons/fa';
import { subscribeToNewsletter } from '../../../services/newsletterService';
import { getApiErrorMessage } from '../../../utils/apiError';
import './NewsletterSignup.css';

interface Props {
  title?: string;
  text?: string;
  buttonText?: string;
}

/**
 * Newsletter sign-up box (home block). Email + privacy consent; the backend then emails a
 * confirmation link (double opt-in), so the success message asks to check the inbox. Empty texts
 * fall back to the defaults.
 */
const NewsletterSignup: React.FC<Props> = ({ title, text, buttonText }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await subscribeToNewsletter(email.trim(), acceptPrivacy);
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t('newsletter.signup.error')));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="newsletter-signup">
      <FaEnvelopeOpenText className="newsletter-signup-icon" aria-hidden="true" />
      <h2 className="newsletter-signup-title">{title?.trim() || t('newsletter.signup.defaultTitle')}</h2>
      <p className="newsletter-signup-text">{text?.trim() || t('newsletter.signup.defaultText')}</p>
      {done ? (
        <Alert variant="success" className="newsletter-signup-done mb-0" role="status">{t('newsletter.signup.success')}</Alert>
      ) : (
        <Form onSubmit={handleSubmit} className="newsletter-signup-form">
          <div className="newsletter-signup-row">
            <Form.Control
              type="email" required maxLength={200} value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t('newsletter.signup.emailPlaceholder')} aria-label={t('newsletter.signup.emailLabel')} autoComplete="email"
            />
            <Button type="submit" variant="primary" disabled={sending}>
              {sending ? <><Spinner size="sm" animation="border" className="me-2" />{t('newsletter.signup.sending')}</> : (buttonText?.trim() || t('newsletter.signup.submit'))}
            </Button>
          </div>
          <Form.Check
            id="newsletter-accept-privacy" type="checkbox" required className="newsletter-signup-consent"
            checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)}
            label={
              <>
                {t('contact.privacyPrefix')}{' '}
                {/* New tab, so following the link doesn't lose what was typed. */}
                <Link to="/proteccion-de-datos" target="_blank" rel="noopener noreferrer">{t('contact.privacyLink')}</Link>
              </>
            }
          />
          {error && <Alert variant="danger" className="py-2 mt-2 mb-0">{error}</Alert>}
        </Form>
      )}
    </div>
  );
};

export default NewsletterSignup;
