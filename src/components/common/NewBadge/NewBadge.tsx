import React from 'react';
import { useTranslation } from 'react-i18next';
import './NewBadge.css';

/** "Nuevo" label for products whose NewUntil date hasn't passed (see backend ProductNewness). */
const NewBadge: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation();
  return <span className={`new-badge${className ? ` ${className}` : ''}`}>{t('product.new')}</span>;
};

export default NewBadge;
