import React, { useEffect, useRef, useState } from 'react';
import { Container, Alert, Button, Badge, Spinner } from 'react-bootstrap';
import { useParams, useSearchParams } from 'react-router-dom';
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
import type { StorefrontPageDetail, StorefrontPageItem } from '../../../types';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { isSafeHttpUrl } from '../../../utils/safeUrl';
import PageLoader from '../../../components/common/ScissorsLoader/PageLoader';
import IconTooltip from '../../../components/common/IconTooltip/IconTooltip';
import PageItemsGrid from '../../../components/common/PageItemsGrid';
import CatalogPagination from '../../../components/common/CatalogPagination/CatalogPagination';

// 24 fills whole rows at every products-block column count (2, 3, 4 or 6).
const PAGE_SIZE = 24;
const EMPTY_FACETS = { minPrice: 0, maxPrice: 0, widths: [], materials: [] };

const PageCatalogPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  // "Ver todos": a category page listing its own products and every subpage's. In the URL so it
  // can be shared and the browser's back button returns to the subpages.
  const [searchParams, setSearchParams] = useSearchParams();
  const showAll = searchParams.get('todos') === '1';
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

  // Phones get "Cargar más" instead of page numbers: each tap adds the next page's products
  // under the ones already shown. `items` is what's listed so far; `loadedPage` the last page in it.
  const isMobile = useMediaQuery('(max-width: 767.98px)');
  const [items, setItems] = useState<StorefrontPageItem[]>([]);
  const [loadedPage, setLoadedPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  // Bumped by every main load, so a "Cargar más" still in flight for the previous slug, view,
  // filters or language is dropped instead of appended.
  const loadGeneration = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- another category (slug) or view starts from page 1 with no filters
    setCurrentPage(1);
    setFilters({});
  }, [slug, showAll]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- crossing the phone breakpoint (e.g. rotating a tablet) switches between page numbers and "Cargar más": start over from page 1
    setCurrentPage(1);
  }, [isMobile]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    loadGeneration.current += 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data load: setState here is the loading/reset step of an external fetch
    setLoading(true);
    setNotFound(false);
    setLoadingMore(false);
    setLoadMoreError(false);
    getPageBySlug(slug, currentPage, PAGE_SIZE, filters, showAll)
      .then(data => {
        if (cancelled) return;
        // externalUrl is an override independent of Type (NavMenu/MobileMenuSheet honor it the
        // same way) — PageType has no "ExternalLink" member, so gating on data.type here could
        // never actually match, leaving this redirect permanently unreachable.
        // Only http(s): location.href isn't covered by React's javascript: blocking, so a stored
        // javascript: URL here would run in every visitor's session (the backend now rejects it
        // too — PageDto.ExternalUrl).
        if (isSafeHttpUrl(data.externalUrl)) {
          window.location.href = data.externalUrl;
          return;
        }
        setPageDetail(data);
        setItems(data.items);
        setLoadedPage(currentPage);
      })
      .catch(e => { if (cancelled) return; if (e?.response?.status === 404) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // Clicking a different category link (or rapidly toggling filters) before the previous
    // request resolves doesn't unmount this component — without this guard, an older slug's/
    // filter-state's slower response could resolve after a newer one's and silently overwrite the
    // page with the wrong category's products while the URL/filters still show the new state.
    return () => { cancelled = true; };
  }, [slug, currentPage, filters, showAll, i18n.language]);

  const setShowAll = (value: boolean) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set('todos', '1');
      else next.delete('todos');
      return next;
    });
    // ScrollToTop only reacts to a new path, not a new query string.
    window.scrollTo(0, 0);
  };

  const loadMore = () => {
    if (!slug || loadingMore) return;
    const generation = loadGeneration.current;
    const next = loadedPage + 1;
    setLoadingMore(true);
    setLoadMoreError(false);
    getPageBySlug(slug, next, PAGE_SIZE, filters, showAll)
      .then(data => {
        if (generation !== loadGeneration.current) return;
        // Skips one already listed, should the catalog have shifted between the two requests.
        setItems(prev => {
          const listed = new Set(prev.map(i => i.variantId));
          return [...prev, ...data.items.filter(i => !listed.has(i.variantId))];
        });
        setLoadedPage(next);
        setPageDetail(prev => prev && { ...prev, totalItems: data.totalItems, totalPages: data.totalPages });
      })
      .catch(() => { if (generation === loadGeneration.current) setLoadMoreError(true); })
      .finally(() => { if (generation === loadGeneration.current) setLoadingMore(false); });
  };

  const handleFilterChange = (f: PageFilters) => {
    setFilters(f);
    setCurrentPage(1);
  };

  if (loading) return (
    <MainLayout>
      <PageLoader />
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

  // What the products grid / Products block list: on a phone, every page loaded so far.
  const listed: StorefrontPageDetail = isMobile ? { ...pageDetail, items } : pageDetail;
  const facets = pageDetail.facets ?? EMPTY_FACETS;
  const hasActiveFilters = filters.minPrice !== undefined || filters.maxPrice !== undefined
    || filters.width !== undefined || !!filters.material || !!filters.orderBy || !!filters.onlyNew;
  // The normal view only lists products through a Products block: a section page with only its
  // subpages mosaic showed filters and page numbers for products it never displays.
  const listsItems = showAll || (pageDetail.blocks ?? []).some(b => b.type === 'Products');
  const showFilters = listsItems && (pageDetail.totalItems > 0 || hasActiveFilters);

  const CONTENT_TYPES = ['TermsAndConditions', 'PrivacyPolicy', 'WithdrawalPolicy', 'DeliveryInfo', 'CookiePolicy', 'Content', 'Form'];
  const isContentPage = CONTENT_TYPES.includes(pageDetail.type);

  const activeCount = [
    filters.minPrice !== undefined || filters.maxPrice !== undefined,
    filters.width !== undefined,
    !!filters.material,
    !!filters.orderBy,
    !!filters.onlyNew,
  ].filter(Boolean).length;

  return (
    <MainLayout>
      {/* ── Floating filter sidebar ── */}
      <>
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
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 my-4">
              <div>
                <h1 className="fw-bold mb-0">{pageDetail.name}</h1>
                {showAll && pageDetail.allProductsCount != null && (
                  <p className="text-muted mb-0">{t('catalog.allProducts.subtitle', { count: pageDetail.allProductsCount })}</p>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                {showAll ? (
                  <Button variant="outline-secondary" size="sm" onClick={() => setShowAll(false)}>
                    {t('catalog.allProducts.back')}
                  </Button>
                ) : pageDetail.allProductsCount != null && (
                  <Button variant="outline-primary" size="sm" onClick={() => setShowAll(true)}>
                    {t('catalog.allProducts.button', { count: pageDetail.allProductsCount })}
                  </Button>
                )}

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
            </div>

            {listsItems && pageDetail.totalItems === 0 && hasActiveFilters && (
              <p className="text-muted py-5 text-center">
                {t('filters.noResults')}
              </p>
            )}

            {showAll ? (
              // Just the products: the page's blocks (intro, subpages mosaic…) belong to its
              // normal view, and its Products block may not exist on a section page.
              listed.items.length > 0
                ? <PageItemsGrid items={listed.items} />
                : !hasActiveFilters && <p className="text-muted py-5 text-center">{t('catalog.allProducts.empty')}</p>
            ) : pageDetail.blocks?.length > 0 && (
              <PageBlockRenderer blocks={pageDetail.blocks} pageDetail={listed} />
            )}

            {listsItems && (isMobile ? (
              listed.items.length < pageDetail.totalItems && (
                <div className="d-flex flex-column align-items-center gap-2 mt-4">
                  {loadMoreError && (
                    <Alert variant="danger" className="mb-0 py-2 text-center">{t('catalog.loadMore.error')}</Alert>
                  )}
                  <Button variant="outline-primary" onClick={loadMore} disabled={loadingMore} className="d-flex align-items-center gap-2">
                    {loadingMore && <Spinner animation="border" size="sm" />}
                    {t('catalog.loadMore.button')}
                  </Button>
                  <small className="text-muted">
                    {t('catalog.loadMore.progress', { shown: listed.items.length, total: pageDetail.totalItems })}
                  </small>
                </div>
              )
            ) : (
              <CatalogPagination currentPage={currentPage} totalPages={pageDetail.totalPages} onChange={setCurrentPage} />
            ))}
          </>
        )}
      </Container>
    </MainLayout>
  );
};

export default PageCatalogPage;
