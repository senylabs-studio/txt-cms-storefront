import React, { useState } from 'react';
import axios from 'axios';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { register as registerService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await registerService({ name, email, password, phone: phone || undefined });
      login(data);
      navigate('/catalog', { replace: true });
    } catch (e) {
      const msg = axios.isAxiosError(e) ? (e.response?.data?.message ?? e.response?.data?.errors) : undefined;
      setError(typeof msg === 'string' ? msg : t('auth.register.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Container className="py-5 d-flex justify-content-center">
        <Card style={{ width: '100%', maxWidth: 460 }}>
          <Card.Body className="p-4">
            <h4 className="fw-bold mb-4 text-center">{t('auth.register.title')}</h4>

            {error && <Alert variant="danger" className="py-2">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auth.register.fullName')}</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('auth.register.namePlaceholder')}
                  required
                  autoFocus
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('auth.login.email')}</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.login.emailPlaceholder')}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('auth.login.password')}</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.register.passwordHint')}
                  minLength={6}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>{t('auth.register.phone')} <span className="text-muted">{t('auth.register.phoneOptional')}</span></Form.Label>
                <Form.Control
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder={t('auth.register.phonePlaceholder')}
                />
              </Form.Group>

              <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                {loading ? <><Spinner size="sm" animation="border" className="me-2" />{t('auth.register.loading')}</> : t('auth.register.submit')}
              </Button>
            </Form>

            <hr />
            <p className="text-center text-muted small mb-0">
              {t('auth.register.hasAccount')}{' '}
              <Link to="/login">{t('auth.register.loginLink')}</Link>
            </p>
          </Card.Body>
        </Card>
      </Container>
    </MainLayout>
  );
};

export default RegisterPage;
