import React from 'react';
import { Button } from 'react-bootstrap';
import { FaBell, FaRegBell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStockNotifications } from '../../../contexts/StockNotificationContext';
import { useAuth } from '../../../contexts/AuthContext';

interface Props {
  productId?: number;
  variantId?: number;
  size?: 'sm' | 'lg';
  className?: string;
}

const NotifyMeButton: React.FC<Props> = ({ productId, variantId, size, className = '' }) => {
  const { t } = useTranslation();
  const { isRequested, toggle } = useStockNotifications();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const active = isRequested(productId, variantId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    await toggle(productId, variantId);
  };

  return (
    <Button
      variant={active ? 'success' : 'outline-secondary'}
      size={size}
      className={className}
      onClick={handleClick}
    >
      {active ? <FaBell className="me-2" /> : <FaRegBell className="me-2" />}
      {t(active ? 'stockNotifications.subscribed' : 'stockNotifications.notifyMe')}
    </Button>
  );
};

export default NotifyMeButton;
