import React, { useState } from 'react';
import { Container, Card, Button, Alert, Spinner, Form } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { confirmEmail, confirmEmailChange } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import PasswordInput from '../../components/common/PasswordInput/PasswordInput';

/**
 * Targets of the account email links: /email/confirmar (after registering) and /email/cambio
 * (sent to the new address of an email change). Confirms on a button press, not on load: mail
 * scanners that open links by themselves must not use them up. Asks for the account's password
 * too: the link proves the email, the password that the account is theirs (anyone can register
 * someone else's email, and confirming it used to hand that person the owner's guest orders).
 */
const ConfirmEmailPage: React.FC<{ change?: boolean }> = ({ change = false }) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user') ?? '';
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';
  const complete = !!userId && !!token && (!change || !!email);

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (change) {
        const session = await confirmEmailChange(userId, email, token, password);
        if (session) login(session);
      }
      else await confirmEmail(userId, token, password);
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
                <Form onSubmit={handleConfirm} className="text-start">
                  <Form.Group className="mb-2" controlId="confirm-email-password">
                    <Form.Label>{t('emailConfirm.password')}</Form.Label>
                    <PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
                  </Form.Group>
                  <p className="text-muted small">{t('emailConfirm.notYou')}</p>
                  {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                  <div className="text-center">
                    <Button type="submit" variant="primary" disabled={loading || !password}>
                      {loading
                        ? <><Spinner size="sm" animation="border" className="me-2" />{t('emailConfirm.loading')}</>
                        : t(change ? 'emailConfirm.changeConfirm' : 'emailConfirm.confirm')}
                    </Button>
                  </div>
                </Form>
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
