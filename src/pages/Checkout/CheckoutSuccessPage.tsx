import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Button, Card, Form, Alert } from 'react-bootstrap';
import { FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { convertGuestAccount } from '../../services/authService';

const CheckoutSuccessPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchCart } = useCart();
  const { isGuest, login } = useAuth();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Refresh cart so it clears the checked-out cart
    fetchCart();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = await convertGuestAccount(password);
      login(data);
      setSaved(true);
    } catch (err) {
      setError((axios.isAxiosError(err) ? err.response?.data?.message : undefined) ?? t('authGate.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <Container className="py-5 text-center" style={{ maxWidth: 520 }}>
        <FaCheckCircle size={64} className="text-success mb-3" />
        <h2 className="fw-bold mb-2">{t('checkoutSuccess.title')}</h2>
        <p className="text-muted mb-4">{t('checkoutSuccess.message')}</p>
        <div className="d-flex gap-2 justify-content-center">
          <Button variant="primary" onClick={() => navigate('/account/orders')}>{t('checkoutSuccess.viewOrders')}</Button>
          <Button variant="outline-secondary" onClick={() => navigate('/catalog')}>{t('checkoutSuccess.continueShopping')}</Button>
        </div>

        {isGuest && !saved && (
          <Card className="mt-4 text-start">
            <Card.Body>
              <h5 className="fw-bold">{t('checkoutSuccess.setPasswordTitle')}</h5>
              <p className="text-muted small">{t('checkoutSuccess.setPasswordSubtitle')}</p>
              {error && <Alert variant="danger" className="py-2">{error}</Alert>}
              <Form onSubmit={handleSetPassword} className="d-flex gap-2">
                <Form.Control
                  type="password"
                  placeholder={t('authGate.password')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? t('authGate.submitting') : t('checkoutSuccess.setPasswordSubmit')}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        )}
        {saved && <Alert variant="success" className="mt-4">{t('checkoutSuccess.setPasswordSuccess')}</Alert>}
      </Container>
    </MainLayout>
  );
};

export default CheckoutSuccessPage;
