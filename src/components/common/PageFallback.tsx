import React from 'react';
import { Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/** Shown for the moment a page loaded on demand takes to arrive. */
const PageFallback: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '50vh' }} role="status">
      <Spinner animation="border" />
      <span className="visually-hidden">{t('common.loading')}</span>
    </div>
  );
};

export default PageFallback;
