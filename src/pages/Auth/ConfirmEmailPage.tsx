import React, { useState } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { confirmEmail, confirmEmailChange } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';

/**
 * Targets of the account email links: /email/confirmar (after registering) and /email/cambio
 * (sent to the new address of an email change). Confirms on a button press, not on load: mail
 * scanners that open links by themselves must not use them up.
 */
const ConfirmEmailPage: React.FC<{ change?: boolean }> = ({ change = false }) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user') ?? '';
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';
  const complete = !!userId && !!token && (!change || !!email);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      if (change) {
        const session = await confirmEmailChange(userId, email, token);
        if (session) login(session);
      }
      else await confirmEmail(userId, token);
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t(change ? 'emailConfirm.changeError' : 'emailConfirm.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Container className="py-5 d-flex justify-content-center">
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <Card.Body className="p-4 text-center">
            <h4 className="fw-bold mb-4">{t(change ? 'emailConfirm.changeTitle' : 'emailConfirm.title')}</h4>

            {done ? (
              <>
                <Alert variant="success" className="py-2">
                  {change ? t('emailConfirm.changeSuccess', { email }) : t('emailConfirm.success')}
                </Alert>
                {change && <Link to="/account" className="btn btn-primary w-100">{t('emailConfirm.goToAccount')}</Link>}
              </>
            ) : !complete ? (
              <Alert variant="danger" className="py-2">{t('emailConfirm.invalidLink')}</Alert>
            ) : (
              <>
                <p className="text-muted small">
                  {change ? t('emailConfirm.changeInstructions', { email }) : t('emailConfirm.instructions')}
                </p>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                <Button variant="primary" onClick={handleConfirm} disabled={loading}>
                  {loading
                    ? <><Spinner size="sm" animation="border" className="me-2" />{t('emailConfirm.loading')}</>
                    : t(change ? 'emailConfirm.changeConfirm' : 'emailConfirm.confirm')}
                </Button>
              </>
            )}

            <hr />
            <p className="text-center text-muted small mb-0">
              <Link to="/">{t('emailConfirm.backToHome')}</Link>
            </p>
          </Card.Body>
        </Card>
      </Container>
    </MainLayout>
  );
};

export default ConfirmEmailPage;
