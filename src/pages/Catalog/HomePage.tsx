import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, InputGroup, Button, Spinner, Pagination, Badge, Alert } from 'react-bootstrap';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import VariantCard from '../../components/Product/VariantCard/VariantCard';
import ProductFilters from '../../components/common/ProductFilters';
import { getVariantsPaged } from '../../services/productService';
import { getApiErrorMessage } from '../../utils/apiError';
import type { PageFilters } from '../../services/pageService';
import type { StorefrontVariant, PageFilterFacets } from '../../types';
import useDebounce from '../../hooks/useDebounce';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import './PageCatalogPage/PageCatalogPage.css';

const EMPTY_FACETS: PageFilterFacets = { minPrice: 0, maxPrice: 0, widths: [], materials: [] };

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { siteName, siteDescription } = useSiteSettings();
  useDocumentMeta(`${t('catalog.home.title')} — ${siteName}`, siteDescription || undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const [variants, setVariants] = useState<StorefrontVariant[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [facets, setFacets] = useState<PageFilterFacets>(EMPTY_FACETS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
  }, [searchParams]);
  const [filters, setFilters] = useState<PageFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setLoading(true);
    setError('');
    getVariantsPaged(currentPage, 12, debouncedSearch, undefined, filters.orderBy || 'name', 'asc', filters)
      .then(r => { setVariants(r.items); setTotalPages(r.totalPages); setTotalItems(r.totalItems); setFacets(r.facets ?? EMPTY_FACETS); })
      .catch(err => setError(getApiErrorMessage(err, t('catalog.home.loadError'))))
      .finally(() => setLoading(false));
  }, [currentPage, debouncedSearch, filters, i18n.language]);

  useEffect(() => {
    setCurrentPage(1);
    if (debouncedSearch) setSearchParams({ search: debouncedSearch });
    else setSearchParams({});
  }, [debouncedSearch]);

  const handleFilterChange = (f: PageFilters) => {
    setFilters(f);
    setCurrentPage(1);
  };

  const activeCount = [
    filters.minPrice !== undefined || filters.maxPrice !== undefined,
    filters.width !== undefined,
    !!filters.material,
    !!filters.orderBy,
  ].filter(Boolean).length;

  return (
    <MainLayout>
      {/* ── Floating filter sidebar ── */}
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

      <Container className="py-4">
        <div className="catalog-hero mb-4">
          <h1 className="catalog-title">{t('catalog.home.title')}</h1>
          <p className="catalog-subtitle text-muted">{t('catalog.home.itemsAvailable', { count: totalItems })}</p>
        </div>

        <Row className="mb-4 align-items-center">
          <Col md={6}>
            <InputGroup>
              <Form.Control
                placeholder={t('catalog.home.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <InputGroup.Text><FaSearch /></InputGroup.Text>
            </InputGroup>
          </Col>
          <Col md="auto" className="ms-auto">
            <Button
              variant={activeCount > 0 ? 'primary' : 'outline-secondary'}
              className="d-flex align-items-center gap-2"
              onClick={() => setSidebarOpen(true)}
            >
              <FaFilter />
              {t('filters.title')}
              {activeCount > 0 && (
                <Badge bg="light" text="dark" pill>{activeCount}</Badge>
              )}
            </Button>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : variants.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p>{search ? t('catalog.home.noResultsFor', { search }) : t('catalog.home.noResults')}</p>
            {search && <Button variant="outline-primary" onClick={() => setSearch('')}>{t('catalog.home.viewAll')}</Button>}
          </div>
        ) : (
          <Row xs={2} sm={2} md={3} lg={4} className="g-3">
            {variants.map(v => (
              <Col key={v.id}>
                <VariantCard variant={v} />
              </Col>
            ))}
          </Row>
        )}

        {totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4">
            <Pagination>
              <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} />
              {Array.from({ length: totalPages }, (_, i) => (
                <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
                  {i + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} />
            </Pagination>
          </div>
        )}
      </Container>
    </MainLayout>
  );
};

export default HomePage;
