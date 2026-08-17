import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { forgotPassword } from '../../services/authService';

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError(t('auth.forgotPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Container className="py-5 d-flex justify-content-center">
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <Card.Body className="p-4">
            <h4 className="fw-bold mb-4 text-center">{t('auth.forgotPassword.title')}</h4>

            {sent ? (
              <Alert variant="success" className="py-2">{t('auth.forgotPassword.success')}</Alert>
            ) : (
              <>
                <p className="text-muted small">{t('auth.forgotPassword.instructions')}</p>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-4">
                    <Form.Label>{t('auth.login.email')}</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('auth.login.emailPlaceholder')}
                      required
                      autoFocus
                    />
                  </Form.Group>

                  <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                    {loading ? <><Spinner size="sm" animation="border" className="me-2" />{t('auth.forgotPassword.loading')}</> : t('auth.forgotPassword.submit')}
                  </Button>
                </Form>
              </>
            )}

            <hr />
            <p className="text-center text-muted small mb-0">
              <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
            </p>
          </Card.Body>
        </Card>
      </Container>
    </MainLayout>
  );
};

export default ForgotPasswordPage;
