import React from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { useToast } from '../../../contexts/ToastContext';

const GlobalToast: React.FC = () => {
  const { toasts, dismissToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 2000 }}>
      {toasts.map(toast => (
        <Toast key={toast.id} bg={toast.variant} onClose={() => dismissToast(toast.id)} show>
          <Toast.Body className={toast.variant === 'success' || toast.variant === 'danger' ? 'text-white' : undefined}>
            {toast.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default GlobalToast;
