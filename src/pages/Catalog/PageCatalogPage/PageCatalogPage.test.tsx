import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import PageCatalogPage from './PageCatalogPage';
import type { StorefrontPageDetail } from '../../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
  // pageService.ts transitively imports apiClient.ts -> src/i18n.ts, whose module-level
  // `i18n.use(initReactI18next)` would otherwise blow up once this mock replaces the real export.
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('../../../components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../components/common/PageBlockRenderer', () => ({ default: () => <div /> }));
vi.mock('../../../components/common/ContactForm/ContactForm', () => ({ default: () => <div /> }));
vi.mock('../../../components/common/ProductFilters', () => ({ default: () => <div /> }));
vi.mock('../../../components/Product/VariantCard/VariantCard', () => ({
  default: ({ variant }: { variant: { id: number } }) => <div data-testid={`variant-card-${variant.id}`} />,
}));
vi.mock('../SitemapPage/SitemapContent', () => ({ default: () => <div /> }));

vi.mock('../../../contexts/SiteSettingsContext', () => ({
  useSiteSettings: () => ({ siteName: 'TXT Shop' }),
}));

const { getPageBySlug } = vi.hoisted(() => ({ getPageBySlug: vi.fn() }));
vi.mock('../../../services/pageService', async () => {
  const actual = await vi.importActual('../../../services/pageService');
  return { ...actual, getPageBySlug };
});

const pageDetail = (overrides: Partial<StorefrontPageDetail> = {}): StorefrontPageDetail => ({
  id: 1, name: 'Telas de lino', slug: 'telas-lino', description: '', type: 'ProductCategory',
  items: [], totalItems: 0, totalPages: 1, currentPage: 1, blocks: [], childPages: [],
  ...overrides,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

// Regression test: the data-fetching effect had no stale-response guard — clicking a different
// category link before the previous request resolves doesn't unmount this component, so an older
// slug's slower response could resolve after a newer slug's and silently overwrite the page with
// the wrong category's products/name while the URL still showed the new slug. Same bug class
// already fixed elsewhere this session (block-translation editors, VariantDetailPage, etc.).
describe('PageCatalogPage stale-response guard', () => {
  it('ignores a stale response for a slug no longer current after navigating to a different category', async () => {
    const a = deferred<StorefrontPageDetail>();
    const b = deferred<StorefrontPageDetail>();
    getPageBySlug.mockImplementation((slug: string) => (slug === 'telas-lino' ? a.promise : b.promise));

    const router = createMemoryRouter(
      [{ path: '/catalogo/:slug', element: <PageCatalogPage /> }],
      { initialEntries: ['/catalogo/telas-lino'] },
    );
    render(<RouterProvider router={router} />);

    // Navigate to a different category before the first request resolves — mirrors clicking
    // another category link in the nav before a slow response comes back.
    router.navigate('/catalogo/telas-algodon');
    b.resolve(pageDetail({ slug: 'telas-algodon', name: 'Telas de algodón' }));
    await screen.findByText('Telas de algodón');

    // The stale, slower response for the first category resolves afterward — must be ignored.
    a.resolve(pageDetail({ slug: 'telas-lino', name: 'Telas de lino' }));
    await new Promise(r => setTimeout(r, 0));

    expect(screen.getByText('Telas de algodón')).toBeInTheDocument();
    expect(screen.queryByText('Telas de lino')).not.toBeInTheDocument();
  });
});

// Regression test: externalUrl was assigned to window.location.href unchecked, so a stored
// javascript: URL ran as XSS for every visitor of the page. It must be ignored instead.
describe('PageCatalogPage externalUrl', () => {
  it('does not navigate to a javascript: externalUrl and renders the page instead', async () => {
    getPageBySlug.mockResolvedValue(pageDetail({ externalUrl: 'javascript:window.__pwned=true' }));
    const router = createMemoryRouter(
      [{ path: '/pages/:slug', element: <PageCatalogPage /> }],
      { initialEntries: ['/pages/telas-lino'] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Telas de lino')).toBeInTheDocument();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });
});

// "Ver todos los productos": a category page whose subpages add products shows a button that
// lists them all (?todos=1), a page at a time.
describe('PageCatalogPage ver todos', () => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; // jsdom doesn't implement it
  const item = { variantId: 7, productId: 1, name: 'Bambula azul', productName: 'Bambula', code: 'B1', variantSlug: 'b1', productSlug: 'bambula', price: 9, originalPrice: 9, availableStock: 3, order: 1, isNew: false, width: 140, minQuantity: 1, quantityStep: 1 };

  const renderAt = (url: string) => {
    const router = createMemoryRouter(
      [{ path: '/pages/:slug', element: <PageCatalogPage /> }],
      { initialEntries: [url] },
    );
    render(<RouterProvider router={router} />);
    return router;
  };

  it('shows no button when the backend sends no count', async () => {
    getPageBySlug.mockReset().mockResolvedValue(pageDetail({ type: 'Category' }));
    renderAt('/pages/moda');
    await screen.findByText('Telas de lino');
    expect(screen.queryByText('catalog.allProducts.button')).not.toBeInTheDocument();
  });

  it('switches to the all-products view through the URL and asks the backend for it', async () => {
    getPageBySlug.mockReset().mockImplementation((_slug: string, _p: number, _s: number, _f: unknown, all: boolean) =>
      Promise.resolve(all
        ? pageDetail({ type: 'Category', allProductsCount: 1, items: [item as never], totalItems: 1 })
        : pageDetail({ type: 'Category', allProductsCount: 1 })));
    const router = renderAt('/pages/moda');

    fireEvent.click(await screen.findByText('catalog.allProducts.button'));

    expect(await screen.findByText('catalog.allProducts.back')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?todos=1');
    expect(getPageBySlug).toHaveBeenLastCalledWith('moda', 1, 24, {}, true);
    expect(screen.getByTestId('variant-card-7')).toBeInTheDocument();

    fireEvent.click(screen.getByText('catalog.allProducts.back'));
    expect(await screen.findByText('catalog.allProducts.button')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });
});

// A section page with only its subpages mosaic showed filters and page numbers for its own
// products, which it never displays without a Products block.
describe('PageCatalogPage without a Products block', () => {
  it('shows neither filters nor page numbers in the normal view', async () => {
    getPageBySlug.mockReset().mockResolvedValue(pageDetail({ type: 'Category', totalItems: 100, totalPages: 5 }));
    const router = createMemoryRouter(
      [{ path: '/pages/:slug', element: <PageCatalogPage /> }],
      { initialEntries: ['/pages/moda'] },
    );
    render(<RouterProvider router={router} />);

    await screen.findByText('Telas de lino');
    expect(screen.queryByRole('button', { name: /filters\.title/ })).not.toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('shows them when the page has a Products block', async () => {
    getPageBySlug.mockReset().mockResolvedValue(pageDetail({
      type: 'Category', totalItems: 100, totalPages: 5,
      blocks: [{ id: 1, type: 'Products', config: {}, sortOrder: 0 } as never],
    }));
    const router = createMemoryRouter(
      [{ path: '/pages/:slug', element: <PageCatalogPage /> }],
      { initialEntries: ['/pages/moda'] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('button', { name: /filters\.title/ })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
