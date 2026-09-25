import React, { createContext, useContext, useRef, useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { guestCheckout } from '../services/authService';
import { getApiErrorMessage, parseFieldErrors, type FieldErrors } from '../utils/apiError';

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  // A queue, not a single ref: the modal is one shared instance reachable from many
  // concurrently-rendered cards (VariantCard, FeaturedProductsGrid, VariantDetailPage). A single
  // resolveRef would let a second requireAuth() call (e.g. clicking "Add to cart" on a different
  // product before the first prompt is answered) silently clobber the first call's resolver,
  // leaving that first await stuck forever with no error. Everyone waiting resolves together with
  // the same outcome once the gate closes.
  const resolversRef = useRef<Array<(value: boolean) => void>>([]);

  const requireAuth = () => {
    if (isAuthenticated) return Promise.resolve(true);
    return new Promise<boolean>(resolve => {
      resolversRef.current.push(resolve);
      if (!show) {
        setName('');
        setEmail('');
        setError('');
        setFieldErrors({});
        setShow(true);
      }
    });
  };

  const close = (result: boolean) => {
    setShow(false);
    const resolvers = resolversRef.current;
    resolversRef.current = [];
    resolvers.forEach(resolve => resolve(result));
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      const data = await guestCheckout({ name: name.trim(), email: email.trim() });
      login(data);
      close(true);
    } catch (err) {
      const fe = parseFieldErrors(err);
      if (fe) setFieldErrors(fe);
      else setError(getApiErrorMessage(err, t('authGate.error')));
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
              <Form.Control value={name} onChange={e => setName(e.target.value)} required isInvalid={!!fieldErrors.name} />
              <Form.Control.Feedback type="invalid">{fieldErrors.name}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3" controlId="authGateEmail">
              <Form.Label>{t('authGate.email')}</Form.Label>
              <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} required isInvalid={!!fieldErrors.email} />
              <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
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
