import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Card, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { verifyGuestAccessLink } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

const GuestAccessVerifyPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'verifying' | 'error'>(token ? 'verifying' : 'error');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    verifyGuestAccessLink(token)
      .then(data => {
        login(data);
        navigate('/account/orders', { replace: true });
      })
      .catch(e => {
        setError((axios.isAxiosError(e) ? e.response?.data?.message : undefined) ?? t('auth.guestAccess.verifyError'));
        setStatus('error');
      });
    // Only ever run once per token — re-running would try to consume an already-used token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <MainLayout>
      <Container className="py-5 d-flex justify-content-center">
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <Card.Body className="p-4 text-center">
            {status === 'verifying' ? (
              <>
                <Spinner animation="border" variant="primary" className="mb-3" />
                <p className="text-muted mb-0">{t('auth.guestAccess.verifying')}</p>
              </>
            ) : (
              <>
                <Alert variant="danger" className="py-2">{error || t('auth.guestAccess.verifyError')}</Alert>
                <Link to="/guest-access" className="btn btn-primary w-100">{t('auth.guestAccess.tryAgain')}</Link>
              </>
            )}
          </Card.Body>
        </Card>
      </Container>
    </MainLayout>
  );
};

export default GuestAccessVerifyPage;
