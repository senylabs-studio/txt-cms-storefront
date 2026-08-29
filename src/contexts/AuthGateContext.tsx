import React, { createContext, useContext, useRef, useState } from 'react';
import axios from 'axios';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { guestCheckout } from '../services/authService';

interface AuthGateContextType {
  // Opens a "continue as guest or log in" prompt when the visitor isn't authenticated yet.
  // Resolves true once they're authenticated (guest or otherwise) and the caller can proceed
  // with whatever action triggered it (e.g. adding to cart); false if they dismissed it.
  requireAuth: () => Promise<boolean>;
}

const AuthGateContext = createContext<AuthGateContextType | null>(null);

export const AuthGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const requireAuth = () => {
    if (isAuthenticated) return Promise.resolve(true);
    setName('');
    setEmail('');
    setError('');
    setShow(true);
    return new Promise<boolean>(resolve => { resolveRef.current = resolve; });
  };

  const close = (result: boolean) => {
    setShow(false);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await guestCheckout({ name: name.trim(), email: email.trim() });
      login(data);
      close(true);
    } catch (err) {
      setError((axios.isAxiosError(err) ? err.response?.data?.message : undefined) ?? t('authGate.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLoginInstead = () => {
    close(false);
    navigate('/login');
  };

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}
      <Modal show={show} onHide={() => close(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('authGate.title')}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleGuestSubmit}>
          <Modal.Body>
            <p className="text-muted small mb-3">{t('authGate.subtitle')}</p>
            {error && <Alert variant="danger" className="py-2">{error}</Alert>}
            <Form.Group className="mb-3" controlId="authGateName">
              <Form.Label>{t('authGate.name')}</Form.Label>
              <Form.Control value={name} onChange={e => setName(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3" controlId="authGateEmail">
              <Form.Label>{t('authGate.email')}</Form.Label>
              <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100" disabled={loading}>
              {loading ? t('authGate.submitting') : t('authGate.continueAsGuest')}
            </Button>
          </Modal.Body>
        </Form>
        <Modal.Footer className="justify-content-center border-top-0 pt-0">
          <Button variant="link" onClick={handleLoginInstead}>{t('authGate.haveAccount')}</Button>
        </Modal.Footer>
      </Modal>
    </AuthGateContext.Provider>
  );
};

export const useAuthGate = () => {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error('useAuthGate must be used inside AuthGateProvider');
  return ctx;
};
