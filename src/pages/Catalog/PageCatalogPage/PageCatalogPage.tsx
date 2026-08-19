import React, { useEffect, useState } from 'react';
import { Container, Spinner, Pagination, Alert, Button, Badge } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { FaFilter, FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import './PageCatalogPage.css';
import MainLayout from '../../../components/Layout/MainLayout';
import PageBlockRenderer from '../../../components/common/PageBlockRenderer';
import ContactForm from '../../../components/common/ContactForm/ContactForm';
import ProductFilters from '../../../components/common/ProductFilters';
import SitemapContent from '../SitemapPage/SitemapContent';
import { getPageBySlug, type PageFilters } from '../../../services/pageService';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { StorefrontPageDetail } from '../../../types';

const PAGE_SIZE = 12;
const EMPTY_FACETS = { minPrice: 0, maxPrice: 0, widths: [], materials: [] };

const PageCatalogPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { siteName } = useSiteSettings();

  const [pageDetail, setPageDetail] = useState<StorefrontPageDetail | null>(null);
  useDocumentMeta(
    pageDetail ? `${pageDetail.name} — ${siteName}` : siteName,
    pageDetail?.description || undefined,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<PageFilters>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setFilters({});
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getPageBySlug(slug, currentPage, PAGE_SIZE, filters)
      .then(data => {
        if (data.type === 'ExternalLink' && data.externalUrl) {
          window.location.href = data.externalUrl;
          return;
        }
        setPageDetail(data);
      })
      .catch(e => { if (e?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [slug, currentPage, filters]);

  const handleFilterChange = (f: PageFilters) => {
    setFilters(f);
    setCurrentPage(1);
  };

  if (loading) return (
    <MainLayout>
      <Container className="py-5 text-center"><Spinner animation="border" variant="primary" /></Container>
    </MainLayout>
  );

  if (notFound) return (
    <MainLayout>
      <Container className="py-5"><Alert variant="warning">{t('catalog.notFound')}</Alert></Container>
    </MainLayout>
  );

  if (!pageDetail) return null;

  if (pageDetail.type === 'Sitemap') {
    return (
      <MainLayout>
        <Container className="pb-5">
          <SitemapContent pageName={pageDetail.name} />
        </Container>
      </MainLayout>
    );
  }

  const facets = pageDetail.facets ?? EMPTY_FACETS;
  const hasActiveFilters = filters.minPrice !== undefined || filters.maxPrice !== undefined
    || filters.width !== undefined || !!filters.material || !!filters.orderBy;
  const showFilters = pageDetail.totalItems > 0 || hasActiveFilters;

  const CONTENT_TYPES = ['TermsAndConditions', 'PrivacyPolicy', 'WithdrawalPolicy', 'DeliveryInfo', 'CookiePolicy', 'Content', 'Form'];
  const isContentPage = CONTENT_TYPES.includes(pageDetail.type);

  const activeCount = [
    filters.minPrice !== undefined || filters.maxPrice !== undefined,
    filters.width !== undefined,
    !!filters.material,
    !!filters.orderBy,
  ].filter(Boolean).length;

  return (
    <MainLayout>
      {/* ── Floating filter sidebar ── */}
      <>
        <div className={`filter-backdrop${sidebarOpen ? ' is-open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <div className={`filter-panel${sidebarOpen ? ' is-open' : ''}`}>
          <div className="filter-panel-header">
            <span className="filter-panel-title">{t('filters.title')}</span>
            <button className="filter-panel-close" onClick={() => setSidebarOpen(false)}>
              <FaTimes size={16} />
            </button>
          </div>
          <div className="filter-panel-body">
            <ProductFilters
              facets={facets}
              filters={filters}
              onChange={handleFilterChange}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      </>

      {/* ── Page content (always full-width) ── */}
      <Container className="pb-5">
        {isContentPage ? (
          <div className="page-content">
            <h1 className="page-content-title">{pageDetail.name}</h1>
            {pageDetail.blocks?.length > 0 && (
              <PageBlockRenderer blocks={pageDetail.blocks} pageDetail={pageDetail} />
            )}
            {pageDetail.type === 'Form' && <ContactForm />}
          </div>
        ) : (
          <>
            <div className="d-flex align-items-center justify-content-between my-4">
              <h1 className="fw-bold mb-0">{pageDetail.name}</h1>

              {showFilters && (
                <Button
                  variant={activeCount > 0 ? 'primary' : 'outline-secondary'}
                  size="sm"
                  className="d-flex align-items-center gap-2"
                  onClick={() => setSidebarOpen(true)}
                >
                  <FaFilter />
                  {t('filters.title')}
                  {activeCount > 0 && (
                    <Badge bg="light" text="dark" pill>{activeCount}</Badge>
                  )}
                </Button>
              )}
            </div>

            {pageDetail.totalItems === 0 && hasActiveFilters && (
              <p className="text-muted py-5 text-center">
                {t('filters.noResults')}
              </p>
            )}

            {pageDetail.blocks?.length > 0 && (
              <PageBlockRenderer blocks={pageDetail.blocks} pageDetail={pageDetail} />
            )}

            {pageDetail.totalPages > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <Pagination>
                  <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} />
                  {Array.from({ length: pageDetail.totalPages }, (_, i) => (
                    <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next disabled={currentPage === pageDetail.totalPages} onClick={() => setCurrentPage(p => p + 1)} />
                </Pagination>
              </div>
            )}
          </>
        )}
      </Container>
    </MainLayout>
  );
};

export default PageCatalogPage;
