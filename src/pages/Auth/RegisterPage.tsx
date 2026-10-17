import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import MainLayout from '../../components/Layout/MainLayout';
import { register as registerService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage, parseFieldErrors, withoutFieldError, type FieldErrors } from '../../utils/apiError';
import { meetsPasswordRules } from '../../utils/password';
import PasswordInput from '../../components/common/PasswordInput/PasswordInput';

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const { siteName } = useSiteSettings();
  // The tab title: this screen's, not the previous page's.
  useDocumentMeta(`${t('auth.register.title')} — ${siteName}`);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetsPasswordRules(password)) {
      setError(t('auth.register.passwordHint'));
      return;
    }
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      const data = await registerService({ name, email, password, phone: phone || undefined, subscribeToNewsletter: newsletter });
      login(data);
      showToast('info', t('auth.register.confirmEmailSent', { email }));
      navigate('/catalog', { replace: true });
    } catch (e) {
      const fe = parseFieldErrors(e);
      if (fe) setFieldErrors(fe);
      else setError(getApiErrorMessage(e, t('auth.register.error')));
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
                  onChange={e => { setName(e.target.value); setFieldErrors(errs => withoutFieldError(errs, 'name')); }}
                  placeholder={t('auth.register.namePlaceholder')}
                  isInvalid={!!fieldErrors.name}
                  required
                  autoFocus
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.name}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('auth.login.email')}</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFieldErrors(errs => withoutFieldError(errs, 'email')); }}
                  placeholder={t('auth.login.emailPlaceholder')}
                  isInvalid={!!fieldErrors.email}
                  required
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('auth.login.password')}</Form.Label>
                <PasswordInput
                  showRules
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(errs => withoutFieldError(errs, 'password')); }}
                  placeholder={t('auth.register.passwordHint')}
                  minLength={6}
                  isInvalid={!!fieldErrors.password}
                  feedback={fieldErrors.password}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('auth.register.phone')} <span className="text-muted">{t('auth.register.phoneOptional')}</span></Form.Label>
                <Form.Control
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder={t('auth.register.phonePlaceholder')}
                />
              </Form.Group>

              {/* Unticked by default: consent to marketing email must be given, not assumed (RGPD). */}
              <Form.Check
                id="register-newsletter" type="checkbox" className="mb-4"
                checked={newsletter} onChange={e => setNewsletter(e.target.checked)}
                label={t('auth.register.newsletter')}
              />

              {/* First-layer privacy notice (RGPD art. 13), including the cart and review emails
                  an account receives (LSSI art. 21.2: opt-out in every one). */}
              <p className="small text-muted">
                {t('auth.register.privacyNotice')}{' '}
                <Link to="/proteccion-de-datos" target="_blank" rel="noopener noreferrer">{t('auth.register.privacyLink')}</Link>.
              </p>

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
