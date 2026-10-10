import React, { useEffect, useMemo, useState } from 'react';
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
import { NEW_ARRIVALS_PARAM, FILTER_PARAMS, filtersFromParams, writeFilterParams } from '../../utils/catalogParams';
import ActiveFilters from '../../components/common/ActiveFilters/ActiveFilters';
import { useFilterPanel } from '../../hooks/useFilterPanel';

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
  const filterPanelRef = useFilterPanel(sidebarOpen, () => setSidebarOpen(false));

  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
  }, [searchParams]);
  // Filters and page live in the URL (like category pages): Back from a fabric lands on the same
  // filtered page instead of page 1 with nothing selected. ?novedades=1 (the home "new arrivals"
  // block's link) opens with the "only new" filter on.
  const filtersKey = [...FILTER_PARAMS, NEW_ARRIVALS_PARAM].map(p => searchParams.get(p) ?? '').join('|');
  const filters = useMemo<PageFilters>(() => {
    const f = filtersFromParams(searchParams);
    return searchParams.get(NEW_ARRIVALS_PARAM) === '1' ? { ...f, onlyNew: true } : f;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- filtersKey is what the filters depend on
  }, [filtersKey]);
  const currentPage = Math.max(1, Number.parseInt(searchParams.get('pagina') ?? '', 10) || 1);
  const setCurrentPage = (page: number) => setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    if (page > 1) next.set('pagina', String(page)); else next.delete('pagina');
    return next;
  });
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
    // Only a new search term goes back to page 1 (arriving with the URL's own term — Back from a
    // fabric — keeps the page).
    setSearchParams(prev => {
      if ((prev.get('search') ?? '') === debouncedSearch) return prev;
      const next = new URLSearchParams(prev);
      if (debouncedSearch) next.set('search', debouncedSearch);
      else next.delete('search');
      next.delete('pagina');
      return next;
    }, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setSearchParams changes identity on every navigation, so listing it would loop; sync only when the debounced search changes
  }, [debouncedSearch]);

  const handleFilterChange = (f: PageFilters) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      writeFilterParams(next, f);
      next.delete('pagina');
      // ?novedades=1 is just the home link's way in: the filter itself is now onlyNew.
      next.delete(NEW_ARRIVALS_PARAM);
      return next;
    });
  };

  const activeCount = [
    filters.minPrice !== undefined || filters.maxPrice !== undefined,
    filters.width !== undefined,
    !!filters.material,
    !!filters.pattern,
    !!filters.colors?.length,
    !!filters.orderBy,
    !!filters.onlyNew,
    !!filters.onlyOffers,
  ].filter(Boolean).length;

  return (
    <MainLayout>
      {/* ── Floating filter sidebar ── */}
      <div className={`filter-backdrop${sidebarOpen ? ' is-open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div ref={filterPanelRef} role="dialog" aria-modal="true" aria-label={t('filters.title')} className={`filter-panel${sidebarOpen ? ' is-open' : ''}`}>
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

        <ActiveFilters filters={filters} onChange={handleFilterChange} />

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
