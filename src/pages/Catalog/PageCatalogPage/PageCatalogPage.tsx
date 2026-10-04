import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Container, Alert, Button, Badge, Spinner } from 'react-bootstrap';
import { useLocation, useNavigationType, useParams, useSearchParams } from 'react-router-dom';
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
// A phone coming back to a list reloads at most this many pages of it in one request.
const MAX_RESTORED_PAGES = 20;

// The filters' URL params (same names as the API's).
const FILTER_PARAMS = ['minPrice', 'maxPrice', 'width', 'material', 'orderBy', 'onlyNew'] as const;

const numberParam = (params: URLSearchParams, name: string): number | undefined => {
  const raw = params.get(name);
  if (raw === null || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
};

const filtersFromParams = (params: URLSearchParams): PageFilters => {
  const filters: PageFilters = {};
  const minPrice = numberParam(params, 'minPrice');
  const maxPrice = numberParam(params, 'maxPrice');
  const width = numberParam(params, 'width');
  if (minPrice !== undefined) filters.minPrice = minPrice;
  if (maxPrice !== undefined) filters.maxPrice = maxPrice;
  if (width !== undefined) filters.width = width;
  if (params.get('material')) filters.material = params.get('material')!;
  if (params.get('orderBy')) filters.orderBy = params.get('orderBy')!;
  if (params.get('onlyNew') === '1') filters.onlyNew = true;
  return filters;
};

const writeFilterParams = (params: URLSearchParams, f: PageFilters) => {
  for (const name of FILTER_PARAMS) params.delete(name);
  if (f.minPrice !== undefined) params.set('minPrice', String(f.minPrice));
  if (f.maxPrice !== undefined) params.set('maxPrice', String(f.maxPrice));
  if (f.width !== undefined) params.set('width', String(f.width));
  if (f.material) params.set('material', f.material);
  if (f.orderBy) params.set('orderBy', f.orderBy);
  if (f.onlyNew) params.set('onlyNew', '1');
};

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
  // Page and filters live in the URL too, so coming back from a product (browser back) lands on
  // the same page, with the same filters — and, on a phone, with every page loaded so far.
  const currentPage = Math.max(1, Number.parseInt(searchParams.get('pagina') ?? '', 10) || 1);
  const filtersKey = FILTER_PARAMS.map(p => searchParams.get(p) ?? '').join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt only when a filter param changes (filtersKey), not on every render
  const filters = useMemo(() => filtersFromParams(searchParams), [filtersKey]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Phones get "Cargar más" instead of page numbers: each tap adds the next page's products
  // under the ones already shown, and ?pagina= counts the pages listed.
  const isMobile = useMediaQuery('(max-width: 767.98px)');
  const [items, setItems] = useState<StorefrontPageItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  // What `items` holds: for which slug/view/filters/language, and how many pages. "Cargar más"
  // updates ?pagina= itself, so the load below must not fetch those pages again.
  const listedRef = useRef({ key: '', pages: 0 });
  // Bumped by every main load, so a "Cargar más" still in flight for the previous slug, view,
  // filters or language is dropped instead of appended.
  const loadGeneration = useRef(0);
  const listKey = [slug, showAll, filtersKey, i18n.language].join('#');
  const location = useLocation();
  const navigationType = useNavigationType();

  const updateParams = (change: (p: URLSearchParams) => void, replace = false) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      change(next);
      return next;
    }, { replace });
  };
  const setCurrentPage = (page: number) =>
    updateParams(p => { if (page > 1) p.set('pagina', String(page)); else p.delete('pagina'); });

  // Crossing the phone breakpoint (rotating a tablet) changes what ?pagina= means (page shown vs
  // pages listed): start over from the first page.
  const wasMobile = useRef(isMobile);
  useEffect(() => {
    if (wasMobile.current === isMobile) return;
    wasMobile.current = isMobile;
    updateParams(p => p.delete('pagina'), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a breakpoint change
  }, [isMobile]);

  useEffect(() => {
    if (!slug) return;
    if (isMobile && listedRef.current.key === listKey && listedRef.current.pages === currentPage) return;
    let cancelled = false;
    loadGeneration.current += 1;
    // On a phone, back on a list with several pages loaded: all of them in one request (capped).
    const pages = isMobile ? Math.min(currentPage, MAX_RESTORED_PAGES) : 1;
    // A new page or view (pushed onto history) starts at the top; ScrollToTop only reacts to a new
    // path, not a new query string. Done here rather than in the click handler so the position
    // saved for the entry being left stays where the visitor was.
    if (navigationType === 'PUSH') window.scrollTo(0, 0);
    setLoading(true);
    setNotFound(false);
    setLoadingMore(false);
    setLoadMoreError(false);
    const request = isMobile
      ? getPageBySlug(slug, 1, PAGE_SIZE * pages, filters, showAll)
      : getPageBySlug(slug, currentPage, PAGE_SIZE, filters, showAll);
    request
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
        listedRef.current = { key: listKey, pages };
        if (isMobile && pages !== currentPage) updateParams(p => p.set('pagina', String(pages)), true);
      })
      .catch(e => { if (cancelled) return; if (e?.response?.status === 404) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // Clicking a different category link (or rapidly toggling filters) before the previous
    // request resolves doesn't unmount this component — without this guard, an older slug's/
    // filter-state's slower response could resolve after a newer one's and silently overwrite the
    // page with the wrong category's products while the URL/filters still show the new state.
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listKey covers slug, view, filters and language; navigationType is read, not a trigger
  }, [listKey, currentPage, isMobile]);

  // Back from a product: once the list is there again, return to where the visitor was. The
  // position is kept per history entry; the browser can't restore it itself because the list
  // isn't rendered yet when it tries.
  // The path too: a tab's first page always has the key "default", whichever page it is.
  const scrollKey = `catalog-scroll:${location.key}:${location.pathname}`;
  // A layout effect so the listener is gone before the next page's (shorter) DOM goes in: a
  // passive effect's cleanup runs after paint, by when the browser had clamped the scroll and the
  // listener had saved that instead of where the visitor was.
  useLayoutEffect(() => {
    // Not while the loader shows: the page is short then and the browser clamps the scroll.
    if (loading) return;
    let frame = 0;
    const save = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        try { sessionStorage.setItem(scrollKey, String(Math.round(window.scrollY))); } catch { /* storage unavailable: no restore */ }
      });
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', save); };
  }, [scrollKey, loading]);
  const restoredKey = useRef<string | null>(null);
  useEffect(() => {
    if (loading || navigationType !== 'POP' || restoredKey.current === scrollKey) return;
    restoredKey.current = scrollKey;
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(scrollKey); } catch { /* storage unavailable */ }
    if (saved) window.scrollTo(0, Number(saved));
  }, [loading, navigationType, scrollKey]);

  const setShowAll = (value: boolean) => {
    updateParams(p => {
      for (const name of [...FILTER_PARAMS, 'pagina']) p.delete(name);
      if (value) p.set('todos', '1');
      else p.delete('todos');
    });
  };

  const loadMore = () => {
    if (!slug || loadingMore) return;
    const generation = loadGeneration.current;
    const next = listedRef.current.pages + 1;
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
        listedRef.current = { key: listKey, pages: next };
        // Replace, not push: back should leave the list, not unload it a page at a time.
        updateParams(p => p.set('pagina', String(next)), true);
        setPageDetail(prev => prev && { ...prev, totalItems: data.totalItems, totalPages: data.totalPages });
      })
      .catch(() => { if (generation === loadGeneration.current) setLoadMoreError(true); })
      .finally(() => { if (generation === loadGeneration.current) setLoadingMore(false); });
  };

  // Replaces the history entry: going back shouldn't step through every filter tried.
  const handleFilterChange = (f: PageFilters) => {
    updateParams(p => {
      p.delete('pagina');
      writeFilterParams(p, f);
    }, true);
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
