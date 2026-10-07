import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, InputGroup, Button, Badge, Alert } from 'react-bootstrap';
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
import ScissorsLoader from '../../components/common/ScissorsLoader/ScissorsLoader';
import IconTooltip from '../../components/common/IconTooltip/IconTooltip';
import CatalogPagination from '../../components/common/CatalogPagination/CatalogPagination';
import { NEW_ARRIVALS_PARAM } from '../../utils/catalogParams';

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
  // ?novedades=1 (the home "new arrivals" block's link) opens with the "only new" filter on.
  const [filters, setFilters] = useState<PageFilters>(() => searchParams.get(NEW_ARRIVALS_PARAM) === '1' ? { onlyNew: true } : {});
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getVariantsPaged(currentPage, 12, debouncedSearch, undefined, filters.orderBy || 'name', 'asc', filters)
      .then(r => { if (cancelled) return; setVariants(r.items); setTotalPages(r.totalPages); setTotalItems(r.totalItems); setFacets(r.facets ?? EMPTY_FACETS); })
      .catch(err => { if (!cancelled) setError(getApiErrorMessage(err, t('catalog.home.loadError'))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // Search, filters and page change in quick succession — without this, a slower response for
    // an older search/filter could land last and show results that don't match what's selected.
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t only formats the load-error message; i18n.language is already a dep
  }, [currentPage, debouncedSearch, filters, i18n.language]);

  useEffect(() => {
    setCurrentPage(1);
    // Only the search term lives here; keep the rest of the query (e.g. ?novedades=1).
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch) next.set('search', debouncedSearch);
      else next.delete('search');
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setSearchParams changes identity on every navigation, so listing it would loop; sync only when the debounced search changes
  }, [debouncedSearch]);

  const handleFilterChange = (f: PageFilters) => {
    setFilters(f);
    setCurrentPage(1);
    // Turning "only new" off drops ?novedades=1 too, so a reload doesn't switch it back on.
    if (!f.onlyNew && searchParams.has(NEW_ARRIVALS_PARAM)) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete(NEW_ARRIVALS_PARAM);
        return next;
      });
    }
  };

  const activeCount = [
    filters.minPrice !== undefined || filters.maxPrice !== undefined,
    filters.width !== undefined,
    !!filters.material,
    !!filters.pattern,
    !!filters.orderBy,
    !!filters.onlyNew,
  ].filter(Boolean).length;

  return (
    <MainLayout>
      {/* ── Floating filter sidebar ── */}
      <div className={`filter-backdrop${sidebarOpen ? ' is-open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div className={`filter-panel${sidebarOpen ? ' is-open' : ''}`}>
        <div className="filter-panel-header">
          <span className="filter-panel-title">{t('filters.title')}</span>
          <IconTooltip label={t('filters.close')}>
            <button className="filter-panel-close" onClick={() => setSidebarOpen(false)} aria-label={t('filters.close')}>
              <FaTimes size={16} />
            </button>
          </IconTooltip>
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
          <div className="text-center py-5"><ScissorsLoader /></div>
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

        <CatalogPagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
      </Container>
    </MainLayout>
  );
};

export default HomePage;
