import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { resetPassword } from '../../services/authService';
import { getApiErrorMessage, parseFieldErrors, type FieldErrors } from '../../utils/apiError';
import { meetsPasswordRules } from '../../utils/password';

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  const linkInvalid = !email || !token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetsPasswordRules(newPassword)) {
      setFieldErrors({ newPassword: t('auth.register.passwordHint') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: t('auth.resetPassword.passwordMismatch') });
      return;
    }
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      await resetPassword({ email, token, newPassword });
      setSuccess(true);
    } catch (e) {
      const fe = parseFieldErrors(e);
      if (fe) setFieldErrors(fe);
      else setError(getApiErrorMessage(e, t('auth.resetPassword.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Container className="py-5 d-flex justify-content-center">
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <Card.Body className="p-4">
            <h4 className="fw-bold mb-4 text-center">{t('auth.resetPassword.title')}</h4>

            {success ? (
              <>
                <Alert variant="success" className="py-2">{t('auth.resetPassword.success')}</Alert>
                <div className="text-center">
                  <Link to="/login" className="btn btn-primary w-100">{t('auth.resetPassword.goToLogin')}</Link>
                </div>
              </>
            ) : linkInvalid ? (
              <Alert variant="danger" className="py-2">{t('auth.resetPassword.invalidLink')}</Alert>
            ) : (
              <>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('auth.resetPassword.newPassword')}</Form.Label>
                    <Form.Control
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      minLength={6}
                      isInvalid={!!fieldErrors.newPassword}
                      required
                      autoFocus
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.newPassword}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>{t('auth.resetPassword.confirmPassword')}</Form.Label>
                    <Form.Control
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      minLength={6}
                      isInvalid={!!fieldErrors.confirmPassword}
                      required
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.confirmPassword}</Form.Control.Feedback>
                  </Form.Group>

                  <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                    {loading ? <><Spinner size="sm" animation="border" className="me-2" />{t('auth.resetPassword.loading')}</> : t('auth.resetPassword.submit')}
                  </Button>
                </Form>
              </>
            )}
          </Card.Body>
        </Card>
      </Container>
    </MainLayout>
  );
};

export default ResetPasswordPage;
