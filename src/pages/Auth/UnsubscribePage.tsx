import React, { useState } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { unsubscribeFromNewsletter, optOutOfCartReminders } from '../../services/newsletterService';
import { getApiErrorMessage } from '../../utils/apiError';

const UnsubscribePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  // ?type=cart: the opt-out link of an abandoned-cart reminder, not the newsletter's.
  const cart = searchParams.get('type') === 'cart';
  const k = (key: string) => (cart ? `cartReminders.unsubscribe.${key}` : `newsletter.unsubscribe.${key}`);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleUnsubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      await (cart ? optOutOfCartReminders(token) : unsubscribeFromNewsletter(token));
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t('newsletter.unsubscribe.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Container className="py-5 d-flex justify-content-center">
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <Card.Body className="p-4 text-center">
            <h4 className="fw-bold mb-4">{t(k('title'))}</h4>

            {done ? (
              <Alert variant="success" className="py-2">{t(k('success'))}</Alert>
            ) : !token ? (
              <Alert variant="danger" className="py-2">{t('newsletter.unsubscribe.invalidLink')}</Alert>
            ) : (
              <>
                <p className="text-muted small">{t(k('instructions'))}</p>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                <Button variant="primary" onClick={handleUnsubscribe} disabled={loading}>
                  {loading ? <><Spinner size="sm" animation="border" className="me-2" />{t('newsletter.unsubscribe.loading')}</> : t(k('confirm'))}
                </Button>
              </>
            )}

            <hr />
            <p className="text-center text-muted small mb-0">
              <Link to="/">{t('newsletter.unsubscribe.backToHome')}</Link>
            </p>
          </Card.Body>
        </Card>
      </Container>
    </MainLayout>
  );
};

export default UnsubscribePage;
