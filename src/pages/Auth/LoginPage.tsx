import React, { useState } from 'react';
import axios from 'axios';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { login as loginService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/catalog';
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await loginService({ email, password });
      login(data);
      navigate(from, { replace: true });
    } catch (e) {
      setError((axios.isAxiosError(e) ? e.response?.data?.message : undefined) ?? t('auth.login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Container className="py-5 d-flex justify-content-center">
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <Card.Body className="p-4">
            <h4 className="fw-bold mb-4 text-center">{t('auth.login.title')}</h4>

            {sessionExpired && <Alert variant="warning" className="py-2">{t('auth.login.sessionExpired')}</Alert>}
            {error && <Alert variant="danger" className="py-2">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
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

              <Form.Group className="mb-2">
                <Form.Label>{t('auth.login.password')}</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  required
                />
              </Form.Group>

              <p className="text-end mb-3">
                <Link to="/forgot-password" className="small">{t('auth.forgotPasswordLink')}</Link>
              </p>

              <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                {loading ? <><Spinner size="sm" animation="border" className="me-2" />{t('auth.login.loading')}</> : t('auth.login.submit')}
              </Button>
            </Form>

            <hr />
            <p className="text-center text-muted small mb-0">
              {t('auth.login.noAccount')}{' '}
              <Link to="/register">{t('auth.login.registerLink')}</Link>
            </p>
            <p className="text-center text-muted small mb-0 mt-2">
              <Link to="/guest-access">{t('auth.login.guestAccessLink')}</Link>
            </p>
          </Card.Body>
        </Card>
      </Container>
    </MainLayout>
  );
};

export default LoginPage;
