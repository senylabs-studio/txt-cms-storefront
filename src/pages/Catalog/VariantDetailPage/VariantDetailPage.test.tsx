import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, createMemoryRouter, RouterProvider } from 'react-router-dom';
import VariantDetailPage from './VariantDetailPage';
import type { StorefrontVariantDetail, ProductReview, PaginatedResponse } from '../../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => opts?.count != null ? `${key}(${opts.count})` : key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../../components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../components/common/FavoriteButton/FavoriteButton', () => ({ default: () => <div /> }));
vi.mock('../../../components/common/BoardButton/BoardButton', () => ({ default: () => <div /> }));
vi.mock('../../../components/common/NotifyMeButton/NotifyMeButton', () => ({ default: () => <div /> }));
vi.mock('../../../components/common/CareLabels', () => ({ default: () => <div /> }));
vi.mock('../../../components/Product/VariantCard/VariantCard', () => ({
  default: ({ variant }: { variant: { name: string } }) => <div>{variant.name}</div>,
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const mockAuth = vi.hoisted(() => ({ isAuthenticated: true }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
vi.mock('../../../contexts/AuthGateContext', () => ({ useAuthGate: () => ({ requireAuth: vi.fn().mockResolvedValue(true) }) }));

const mockCart = vi.hoisted(() => ({ addItem: vi.fn(), loading: false }));
vi.mock('../../../contexts/CartContext', () => ({ useCart: () => mockCart }));

vi.mock('../../../contexts/SiteSettingsContext', () => ({ useSiteSettings: () => ({ siteName: 'TXT Shop' }) }));

const { getVariantById, getVariantsBatch } = vi.hoisted(() => ({ getVariantById: vi.fn(), getVariantsBatch: vi.fn().mockResolvedValue([]) }));
vi.mock('../../../services/productService', () => ({ getVariantById, getVariantsBatch }));

const { getProductReviews, getMyReview, submitReview } = vi.hoisted(() => ({
  getProductReviews: vi.fn(),
  getMyReview: vi.fn(),
  submitReview: vi.fn(),
}));
vi.mock('../../../services/reviewService', () => ({ getProductReviews, getMyReview, submitReview }));

const renderPage = (variantId = '1') => render(
  <MemoryRouter initialEntries={[`/variant/${variantId}`]}>
    <Routes><Route path="/variant/:id" element={<VariantDetailPage />} /></Routes>
  </MemoryRouter>,
);

const variant = (overrides: Partial<StorefrontVariantDetail> = {}): StorefrontVariantDetail => ({
  id: 1, code: 'V1', name: 'Tela Azul', description: '', price: 10, originalPrice: 10, discountPercent: 0,
  availableStock: 5, typeValue: 'Azul', images: [], productId: 1, productName: 'Tela', productSlug: 'tela',
  width: 0, weight: 0, composition: '', productTypeName: '', siblings: [], alsoBought: [], alsoBoughtIsFallback: false, reviewCount: 0,
  minQuantity: 0.3, quantityStep: 0.05,
  ...overrides,
});

const reviewsPage = (items: ProductReview[], overrides: Partial<PaginatedResponse<ProductReview>> = {}) => ({
  items, totalItems: items.length, totalPages: 1, currentPage: 1, pageSize: 10, averageRating: null, reviewCount: items.length,
  ...overrides,
});

describe('VariantDetailPage reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    getProductReviews.mockResolvedValue(reviewsPage([]));
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
  });

  it('shows the average rating and review count when the product has reviews', async () => {
    getVariantById.mockResolvedValue(variant({ averageRating: 4.5, reviewCount: 8 }));
    renderPage();

    expect(await screen.findByText('product.reviewCount(8)')).toBeInTheDocument();
  });

  it('hides the rating summary when there are no reviews yet', async () => {
    getVariantById.mockResolvedValue(variant({ reviewCount: 0 }));
    renderPage();

    await screen.findByText('Tela Azul');
    expect(screen.queryByText(/reviewCount/)).not.toBeInTheDocument();
  });

  it('lists the reviews returned for the product', async () => {
    getVariantById.mockResolvedValue(variant());
    getProductReviews.mockResolvedValue(reviewsPage([
      { id: 1, customerName: 'Jane', rating: 5, comment: 'Excelente calidad', createdAt: '2026-01-15T00:00:00.000Z' },
    ]));
    renderPage();

    expect(await screen.findByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Excelente calidad')).toBeInTheDocument();
  });

  it('shows an empty message when the product has no reviews', async () => {
    getVariantById.mockResolvedValue(variant());
    renderPage();

    expect(await screen.findByText('product.noReviews')).toBeInTheDocument();
  });

  it('does not show the review form when the customer has not purchased the product', async () => {
    getVariantById.mockResolvedValue(variant());
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
    renderPage();

    await screen.findByText('Tela Azul');
    expect(screen.queryByText('product.writeReview')).not.toBeInTheDocument();
  });

  it('does not fetch "mine" when the visitor is not authenticated', async () => {
    mockAuth.isAuthenticated = false;
    getVariantById.mockResolvedValue(variant());
    renderPage();

    await screen.findByText('Tela Azul');
    expect(getMyReview).not.toHaveBeenCalled();
  });

  it('shows the review form when the customer has purchased and lets them submit one', async () => {
    getVariantById.mockResolvedValue(variant());
    getMyReview.mockResolvedValue({ hasPurchased: true, review: null });
    submitReview.mockResolvedValue({ id: 9, customerName: 'Jane', rating: 4, comment: 'Bien', createdAt: '2026-01-15T00:00:00.000Z' });
    renderPage();

    expect(await screen.findByText('product.writeReview')).toBeInTheDocument();

    // Click the 4th star to set the rating
    const stars = document.querySelectorAll('.vdp-reviews svg');
    fireEvent.click(stars[3]);
    fireEvent.change(screen.getByPlaceholderText('product.reviewCommentPlaceholder'), { target: { value: 'Bien' } });
    fireEvent.click(screen.getByText('product.submitReview'));

    await waitFor(() => expect(submitReview).toHaveBeenCalledWith('tela', 4, 'Bien'));
    expect(await screen.findByText('product.reviewSaved')).toBeInTheDocument();
  });

  it('prefills the form with the existing review and labels it as editing', async () => {
    getVariantById.mockResolvedValue(variant());
    getMyReview.mockResolvedValue({
      hasPurchased: true,
      review: { id: 1, customerName: 'Jane', rating: 3, comment: 'Ok', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    renderPage();

    expect(await screen.findByText('product.editYourReview')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ok')).toBeInTheDocument();
  });

  it('paginates through review pages', async () => {
    getVariantById.mockResolvedValue(variant());
    getProductReviews
      .mockResolvedValueOnce(reviewsPage(
        [{ id: 1, customerName: 'Jane', rating: 5, createdAt: '2026-01-01T00:00:00.000Z' }],
        { totalPages: 2 },
      ))
      .mockResolvedValueOnce(reviewsPage(
        [{ id: 2, customerName: 'Bob', rating: 3, createdAt: '2026-01-02T00:00:00.000Z' }],
        { totalPages: 2, currentPage: 2 },
      ));
    renderPage();

    await screen.findByText('Jane');
    fireEvent.click(screen.getByText('product.nextPage'));

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(getProductReviews).toHaveBeenCalledWith('tela', 2);
  });
});

describe('VariantDetailPage alsoBought', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    getProductReviews.mockResolvedValue(reviewsPage([]));
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
  });

  const relatedVariant = {
    id: 2, name: 'Otra tela', code: 'V2', price: 5, originalPrice: 5, discountPercent: 0, availableStock: 3,
    productId: 2, productName: 'Otra tela', productSlug: 'otra-tela', minQuantity: 0.3, quantityStep: 0.05,
  };

  it('shows the real co-purchase heading when alsoBought is not a fallback', async () => {
    getVariantById.mockResolvedValue(variant({ alsoBought: [relatedVariant], alsoBoughtIsFallback: false }));
    renderPage();

    expect(await screen.findByText('product.alsoBought')).toBeInTheDocument();
    expect(screen.queryByText('product.youMightAlsoLike')).not.toBeInTheDocument();
  });

  it('shows the "you might also like" heading when alsoBought is a fallback', async () => {
    getVariantById.mockResolvedValue(variant({ alsoBought: [relatedVariant], alsoBoughtIsFallback: true }));
    renderPage();

    expect(await screen.findByText('product.youMightAlsoLike')).toBeInTheDocument();
    expect(screen.queryByText('product.alsoBought')).not.toBeInTheDocument();
  });

  it('renders neither heading when alsoBought is empty', async () => {
    getVariantById.mockResolvedValue(variant({ alsoBought: [], alsoBoughtIsFallback: true }));
    renderPage();

    await screen.findByText('Tela Azul');
    expect(screen.queryByText('product.alsoBought')).not.toBeInTheDocument();
    expect(screen.queryByText('product.youMightAlsoLike')).not.toBeInTheDocument();
  });
});

// Regression test: the data-fetching effect had no stale-response guard — in-app navigation
// between two /variant/:id routes (siblings/alsoBought/recentlyViewed links, or browser Back/
// Forward) doesn't unmount this component, so an older id's slower response resolving after a
// newer id's could silently overwrite the page with the wrong variant's data while the URL still
// showed the new id. Same bug class already fixed elsewhere this session (block-translation
// editors, useEntityTranslations).
describe('VariantDetailPage stale-response guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockAuth.isAuthenticated = true;
    getProductReviews.mockResolvedValue(reviewsPage([]));
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
  });

  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(res => { resolve = res; });
    return { promise, resolve };
  }

  it('ignores a stale response for a variant id no longer current after in-app navigation (no unmount)', async () => {
    const v1 = deferred<StorefrontVariantDetail>();
    const v2 = deferred<StorefrontVariantDetail>();
    getVariantById.mockImplementation((id: number) => (id === 1 ? v1.promise : v2.promise));

    const router = createMemoryRouter(
      [{ path: '/variant/:id', element: <VariantDetailPage /> }],
      { initialEntries: ['/variant/1'] },
    );
    render(<RouterProvider router={router} />);

    // Navigate to variant 2 before variant 1's fetch resolves — mirrors clicking a related-
    // variant link, or Back/Forward, on the same mounted route.
    router.navigate('/variant/2');
    v2.resolve(variant({ id: 2, name: 'Tela Verde' }));
    await screen.findByText('Tela Verde');

    // The stale, slower response for variant 1 resolves afterward — must be ignored.
    v1.resolve(variant({ id: 1, name: 'Tela Azul' }));
    await new Promise(r => setTimeout(r, 0));

    expect(screen.getByText('Tela Verde')).toBeInTheDocument();
    expect(screen.queryByText('Tela Azul')).not.toBeInTheDocument();
  });

  // Regression test: a SECOND effect in this same component (populating the "recently viewed"
  // rail via getVariantsBatch) had no stale-response guard of its own, unlike the main
  // variant-fetch effect above — a genuinely new, previously-unchecked instance of this bug class.
  it('ignores a stale "recently viewed" batch response for a variant id no longer current', async () => {
    localStorage.setItem('recently_viewed_variants', JSON.stringify([99]));
    getVariantById.mockImplementation((id: number) =>
      Promise.resolve(variant({ id, name: id === 1 ? 'Tela Azul' : 'Tela Verde' })));

    const batch1 = deferred<{ id: number; name: string }[]>();
    const batch2 = deferred<{ id: number; name: string }[]>();
    // recordVariantView(id) runs before getRecentlyViewedIds(id) in the effect, so variant 1's
    // batch excludes only [1] (-> ids [99], length 1) and variant 2's excludes only [2]
    // (-> ids [1, 99], length 2) — distinguishable by the ids array length.
    getVariantsBatch.mockImplementation((ids: number[]) => (ids.length === 1 ? batch1.promise : batch2.promise));

    const router = createMemoryRouter(
      [{ path: '/variant/:id', element: <VariantDetailPage /> }],
      { initialEntries: ['/variant/1'] },
    );
    render(<RouterProvider router={router} />);
    await screen.findByText('Tela Azul');

    router.navigate('/variant/2');
    await screen.findByText('Tela Verde');

    // The newer "recently viewed" batch (triggered by variant 2's mount) resolves first.
    batch2.resolve([{ id: 10, name: 'Reciente Nuevo' }]);
    await screen.findByText('Reciente Nuevo');

    // The stale, slower batch from variant 1 resolves afterward — must be ignored.
    batch1.resolve([{ id: 11, name: 'Reciente Viejo' }]);
    await new Promise(r => setTimeout(r, 0));

    expect(screen.getByText('Reciente Nuevo')).toBeInTheDocument();
    expect(screen.queryByText('Reciente Viejo')).not.toBeInTheDocument();
  });

  // Regression test: following an "also bought"/"recently viewed" link to a DIFFERENT product
  // doesn't unmount the page. The customer's own rating/comment for the previous product stayed
  // in the form whenever the new product had no review of theirs yet, ready to be submitted as a
  // review of the wrong product.
  it('does not carry the previous product\'s own review into the form after navigating to another product', async () => {
    getVariantById.mockImplementation((id: number) => Promise.resolve(id === 1
      ? variant()
      : variant({ id: 2, name: 'Lino Verde', productId: 2, productSlug: 'lino' })));
    getMyReview.mockImplementation((slug: string) => Promise.resolve(slug === 'tela'
      ? { hasPurchased: true, review: { id: 1, customerName: 'Jane', rating: 5, comment: 'Genial', createdAt: '2026-01-01T00:00:00.000Z' } }
      : { hasPurchased: true, review: null }));
    const router = createMemoryRouter(
      [{ path: '/variant/:id', element: <VariantDetailPage /> }],
      { initialEntries: ['/variant/1'] },
    );
    render(<RouterProvider router={router} />);
    expect(await screen.findByDisplayValue('Genial')).toBeInTheDocument();

    router.navigate('/variant/2');
    await screen.findByText('Lino Verde');
    await waitFor(() => expect(getMyReview).toHaveBeenCalledWith('lino'));
    await new Promise(r => setTimeout(r, 0));

    expect(screen.queryByDisplayValue('Genial')).not.toBeInTheDocument();
    expect(screen.queryByText('product.editYourReview')).not.toBeInTheDocument();
  });
});
