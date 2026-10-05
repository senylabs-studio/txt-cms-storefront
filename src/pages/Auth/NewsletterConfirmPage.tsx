import React, { useState } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { confirmNewsletter } from '../../services/newsletterService';
import { getApiErrorMessage } from '../../utils/apiError';

/**
 * Target of the link in the newsletter confirmation email (double opt-in). Confirms on a button
 * press, not on load: mail scanners that open links by themselves must not sign anyone up.
 */
const NewsletterConfirmPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await confirmNewsletter(token);
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t('newsletter.confirm.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Container className="py-5 d-flex justify-content-center">
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <Card.Body className="p-4 text-center">
            <h4 className="fw-bold mb-4">{t('newsletter.confirm.title')}</h4>

            {done ? (
              <Alert variant="success" className="py-2">{t('newsletter.confirm.success')}</Alert>
            ) : !token ? (
              <Alert variant="danger" className="py-2">{t('newsletter.confirm.invalidLink')}</Alert>
            ) : (
              <>
                <p className="text-muted small">{t('newsletter.confirm.instructions')}</p>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                <Button variant="primary" onClick={handleConfirm} disabled={loading}>
                  {loading ? <><Spinner size="sm" animation="border" className="me-2" />{t('newsletter.confirm.loading')}</> : t('newsletter.confirm.confirm')}
                </Button>
              </>
            )}

            <hr />
            <p className="text-center text-muted small mb-0">
              <Link to="/">{t('newsletter.confirm.backToHome')}</Link>
            </p>
          </Card.Body>
        </Card>
      </Container>
    </MainLayout>
  );
};

export default NewsletterConfirmPage;
