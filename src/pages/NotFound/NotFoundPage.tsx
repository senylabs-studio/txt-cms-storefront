import React from 'react';
import { Container, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';

/** Any address the shop doesn't have, e.g. an old ePages link with no new home (the server answers
 * it 410). It used to redirect to the home page, so the visitor saw the home under a broken link. */
const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <MainLayout>
      <Container className="py-5">
        <Alert variant="warning" className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>{t('catalog.notFound')}</span>
          <Link to="/" className="alert-link">{t('notFound.home')}</Link>
        </Alert>
      </Container>
    </MainLayout>
  );
};

export default NotFoundPage;
