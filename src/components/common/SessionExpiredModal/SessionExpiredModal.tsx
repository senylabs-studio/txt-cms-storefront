import { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SESSION_EXPIRED_EVENT, isProtectedPath, loginUrl } from '../../../utils/session';

// The API refused the session (expired, or the password changed on another device): on a page
// anyone can see (product, catalog…) the shopper used to just find themselves signed out with no
// word why. Says so and offers the login. A protected page already goes to the login, which
// shows its own «sesión expirada» notice.
const SessionExpiredModal: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onExpired = () => {
      if (!isProtectedPath(window.location.pathname)) setShow(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const goToLogin = () => {
    setShow(false);
    navigate(loginUrl());
  };

  return (
    <Modal show={show} onHide={() => setShow(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>{t('auth.sessionClosed.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{t('auth.sessionClosed.body')}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => setShow(false)}>{t('auth.sessionClosed.continue')}</Button>
        <Button variant="primary" onClick={goToLogin}>{t('auth.sessionClosed.login')}</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SessionExpiredModal;
