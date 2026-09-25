import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
