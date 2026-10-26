import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, createMemoryRouter, RouterProvider } from 'react-router-dom';
import VariantDetailPage from './VariantDetailPage';
import type { StorefrontVariantDetail, ProductReview, PaginatedResponse } from '../../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; amount?: string }) =>
      opts?.count != null ? `${key}(${opts.count})` : opts?.amount != null ? `${key}(${opts.amount})` : key,
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

const { getVariantById, getVariantsBatch, getVariantMatches } = vi.hoisted(() => ({
  getVariantById: vi.fn(),
  getVariantsBatch: vi.fn().mockResolvedValue([]),
  getVariantMatches: vi.fn().mockResolvedValue({ matches: [], matchedBy: [] }),
}));
const { fibreCodes, guide } = vi.hoisted(() => ({ fibreCodes: { map: new Map<string, string>() }, guide: { exists: false } }));
vi.mock('../../../hooks/useMaterialAbbreviations', () => ({ useMaterialAbbreviations: () => fibreCodes.map }));
vi.mock('../../../hooks/useFabricGuide', () => ({
  useFabricGuide: () => guide.exists,
  fabricGuideFibreHref: (code: string) => `/guia-de-tejidos#fibra-${code.toLowerCase()}`,
}));
vi.mock('../../../services/productService', () => ({ getVariantById, getVariantsBatch, getVariantMatches }));

const { getVariantReviews, getMyReview, submitReview } = vi.hoisted(() => ({
  getVariantReviews: vi.fn(),
  getMyReview: vi.fn(),
  submitReview: vi.fn(),
}));
vi.mock('../../../services/reviewService', () => ({ getVariantReviews, getMyReview, submitReview }));

const renderPage = (variantId = '1', hash = '') => render(
  <MemoryRouter initialEntries={[`/variant/${variantId}${hash}`]}>
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
    getVariantReviews.mockResolvedValue(reviewsPage([]));
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
  });

  it('shows the average rating and review count when the product has reviews', async () => {
    getVariantById.mockResolvedValue(variant({ averageRating: 4.5, reviewCount: 8 }));
    renderPage();

    expect(await screen.findByText('product.reviewCount(8)')).toBeInTheDocument();
  });

  // 2026-10-18: the reviews section sits right under the description, with the average, the
  // count and a bar per star, and the stars by the title jump to it.
  it('summarises the reviews with a bar per star, linked from the stars by the title', async () => {
    getVariantById.mockResolvedValue(variant({ averageRating: 4.666, reviewCount: 3, ratingCounts: [0, 0, 0, 1, 2], description: 'Franela suave' }));
    renderPage();

    expect(await screen.findByText('4.7')).toBeInTheDocument();
    expect(screen.getByText('product.reviewTotal(3)')).toBeInTheDocument();
    expect(screen.getAllByText('product.ratingBar(2)')).toHaveLength(1);
    expect(screen.getByText('product.reviewCount(3)').closest('a')).toHaveAttribute('href', '#reviews');
    const section = document.getElementById('reviews')!;
    const description = screen.getAllByText('product.description')[0];
    expect(description.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides the rating summary when there are no reviews yet', async () => {
    getVariantById.mockResolvedValue(variant({ reviewCount: 0 }));
    renderPage();

    await screen.findByText('Tela Azul');
    expect(screen.queryByText(/reviewCount/)).not.toBeInTheDocument();
  });

  it('lists the reviews returned for the product', async () => {
    getVariantById.mockResolvedValue(variant());
    getVariantReviews.mockResolvedValue(reviewsPage([
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

  // The review emails link to the page with #reviews: the form must be open on arrival, and a
  // visitor who isn't logged in (email opened on another device) is sent to log in and back.
  it('opens the review form when arriving with #reviews from a review email', async () => {
    getVariantById.mockResolvedValue(variant());
    getMyReview.mockResolvedValue({ hasPurchased: true, review: null });
    Element.prototype.scrollIntoView = vi.fn(); // jsdom has none; the page scrolls to #reviews
    renderPage('1', '#reviews');

    expect(await screen.findByPlaceholderText('product.reviewCommentPlaceholder')).toBeInTheDocument();
  });

  it('sets the rating tapped in the email (?valorar=4)', async () => {
    getVariantById.mockResolvedValue(variant());
    getMyReview.mockResolvedValue({ hasPurchased: true, review: null });
    Element.prototype.scrollIntoView = vi.fn();
    renderPage('1', '?valorar=4#reviews');

    await screen.findByPlaceholderText('product.reviewCommentPlaceholder');
    expect(screen.getByRole('radio', { name: 'product.ratingOf' , checked: true })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').filter(r => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    expect(screen.getAllByRole('radio')[3]).toHaveAttribute('aria-checked', 'true');
  });

  it('closes the form once a review sent from the email link is saved (it reopened at the email\'s star)', async () => {
    getVariantById.mockResolvedValue(variant());
    getMyReview.mockResolvedValue({ hasPurchased: true, review: null });
    submitReview.mockResolvedValue({ id: 9, customerName: 'Jane', rating: 4, comment: 'Bien', createdAt: '2026-01-15T00:00:00.000Z' });
    Element.prototype.scrollIntoView = vi.fn();
    renderPage('1', '?valorar=4#reviews');

    await screen.findByPlaceholderText('product.reviewCommentPlaceholder');
    fireEvent.click(screen.getByText('product.submitReview'));

    expect(await screen.findByText('product.reviewSaved')).toBeInTheDocument();
    // The reopening came a render later: let the effects run before looking.
    await act(() => new Promise(r => setTimeout(r, 100)));
    expect(screen.queryByPlaceholderText('product.reviewCommentPlaceholder')).not.toBeInTheDocument();
  });

  it('offers a logged-out visitor to log in to write a review, coming back to the reviews', async () => {
    mockAuth.isAuthenticated = false;
    getVariantById.mockResolvedValue(variant());
    renderPage();

    const link = await screen.findByRole('link', { name: 'product.writeReview' });
    expect(link).toHaveAttribute('href', `/login?from=${encodeURIComponent('/variant/1#reviews')}`);
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

    // The form opens from «Escribir una reseña» (2026-10-18: reviews moved under the description).
    fireEvent.click(await screen.findByRole('button', { name: 'product.writeReview' }));

    // Click the 4th star to set the rating
    const stars = document.querySelectorAll('.vdp-rv-form svg');
    fireEvent.click(stars[3]);
    fireEvent.change(screen.getByPlaceholderText('product.reviewCommentPlaceholder'), { target: { value: 'Bien' } });
    fireEvent.click(screen.getByText('product.submitReview'));

    await waitFor(() => expect(submitReview).toHaveBeenCalledWith(1, 4, 'Bien'));
    expect(await screen.findByText('product.reviewSaved')).toBeInTheDocument();
  });

  // 2026-10-18: one review per customer and fabric — theirs heads the list, marked as theirs with
  // «Editar», wherever it falls by date; saving closes the form.
  it('lists the customer\'s own review first, with a button to edit it', async () => {
    const mine = { id: 7, customerName: 'Emili', rating: 1, createdAt: '2026-10-18T17:29:00.000Z' };
    getVariantById.mockResolvedValue(variant({ reviewCount: 2 }));
    getVariantReviews.mockResolvedValue(reviewsPage([
      { id: 3, customerName: 'Jane', rating: 5, comment: 'Excelente', createdAt: '2026-10-19T00:00:00.000Z' }, mine,
    ]));
    getMyReview.mockResolvedValue({ hasPurchased: true, review: mine });
    renderPage();

    await screen.findByText('product.yourReviewBadge');
    const names = Array.from(document.querySelectorAll('.vdp-rv-item .fw-semibold')).map(e => e.textContent);
    expect(names).toEqual(['Emili', 'Jane']);
    fireEvent.click(screen.getByRole('button', { name: 'product.editShort' }));
    expect(screen.getByText('product.editYourReview')).toBeInTheDocument();
  });

  it('closes the form once the review is saved, keeping the thanks', async () => {
    getVariantById.mockResolvedValue(variant());
    getMyReview.mockResolvedValue({ hasPurchased: true, review: null });
    submitReview.mockResolvedValue({ id: 9, customerName: 'Jane', rating: 5, createdAt: '2026-01-15T00:00:00.000Z' });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'product.writeReview' }));
    fireEvent.click(document.querySelectorAll('.vdp-rv-form svg')[4]);
    fireEvent.click(screen.getByText('product.submitReview'));

    expect(await screen.findByText('product.reviewSaved')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('product.reviewCommentPlaceholder')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'product.editReview' })).toBeInTheDocument();
  });

  it('prefills the form with the existing review and labels it as editing', async () => {
    getVariantById.mockResolvedValue(variant());
    getMyReview.mockResolvedValue({
      hasPurchased: true,
      review: { id: 1, customerName: 'Jane', rating: 3, comment: 'Ok', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'product.editReview' }));

    expect(screen.getByText('product.editYourReview')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ok')).toBeInTheDocument();
  });

  it('paginates through review pages', async () => {
    getVariantById.mockResolvedValue(variant());
    getVariantReviews
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
    expect(getVariantReviews).toHaveBeenCalledWith(1, 2);
  });
});

describe('VariantDetailPage reviews across variants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
    getVariantById.mockImplementation((id: number) => Promise.resolve(id === 1 ? variant() : variant({ id: 2, name: 'Lino Verde' })));
  });

  // Reviews are per variant: a reviews page still loading for the previous variant must not land
  // on the one the customer moved to (page links keep this component mounted).
  it('ignores a reviews page that arrives after moving to another variant', async () => {
    let resolveLate!: (v: unknown) => void;
    getVariantReviews.mockImplementation((variantId: number, page: number) => {
      if (variantId === 1 && page === 2) return new Promise(r => { resolveLate = r; });
      if (variantId === 1) return Promise.resolve(reviewsPage([{ id: 1, customerName: 'Jane', rating: 5, createdAt: '2026-01-01T00:00:00.000Z' }], { totalPages: 2 }));
      return Promise.resolve(reviewsPage([]));
    });
    const router = createMemoryRouter([{ path: '/variant/:id', element: <VariantDetailPage /> }], { initialEntries: ['/variant/1'] });
    render(<RouterProvider router={router} />);
    await screen.findByText('Jane');
    fireEvent.click(screen.getByText('product.nextPage'));

    router.navigate('/variant/2');
    await screen.findByText('Lino Verde');
    resolveLate({ ...reviewsPage([{ id: 9, customerName: 'Bob', rating: 1, createdAt: '2026-01-02T00:00:00.000Z' }], { totalPages: 2, currentPage: 2 }), reviewCount: 7 });
    await new Promise(r => setTimeout(r, 0));

    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    expect(screen.queryByText('product.reviewCount(7)')).not.toBeInTheDocument();
  });
});

describe('VariantDetailPage alsoBought', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    getVariantReviews.mockResolvedValue(reviewsPage([]));
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
    getVariantReviews.mockResolvedValue(reviewsPage([]));
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

  // Regression test: following a link to a DIFFERENT variant doesn't unmount the page. The
  // customer's own rating/comment for the previous variant stayed in the form whenever the new one
  // had no review of theirs yet, ready to be submitted as a review of the wrong variant.
  it('does not carry the previous variant\'s own review into the form after navigating to another variant', async () => {
    getVariantById.mockImplementation((id: number) => Promise.resolve(id === 1
      ? variant()
      : variant({ id: 2, name: 'Lino Verde', productId: 2, productSlug: 'lino' })));
    getMyReview.mockImplementation((variantId: number) => Promise.resolve(variantId === 1
      ? { hasPurchased: true, review: { id: 1, customerName: 'Jane', rating: 5, comment: 'Genial', createdAt: '2026-01-01T00:00:00.000Z' } }
      : { hasPurchased: true, review: null }));
    const router = createMemoryRouter(
      [{ path: '/variant/:id', element: <VariantDetailPage /> }],
      { initialEntries: ['/variant/1'] },
    );
    render(<RouterProvider router={router} />);
    fireEvent.click(await screen.findByRole('button', { name: 'product.editReview' }));
    expect(screen.getByDisplayValue('Genial')).toBeInTheDocument();

    router.navigate('/variant/2');
    await screen.findByText('Lino Verde');
    await waitFor(() => expect(getMyReview).toHaveBeenCalledWith(2));
    await new Promise(r => setTimeout(r, 0));

    // The form closes on the new variant and opens empty.
    expect(screen.queryByDisplayValue('Genial')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'product.writeReview' }));
    expect(screen.queryByDisplayValue('Genial')).not.toBeInTheDocument();
    expect(screen.queryByText('product.editYourReview')).not.toBeInTheDocument();
  });
});

// From tablet up the description goes under the photos; on phones (columns stacked) it stays
// after the cart button, or it would push the price and the button down.
describe('VariantDetailPage description placement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    getVariantReviews.mockResolvedValue(reviewsPage([]));
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
  });

  it('renders under the photos from tablet up and in the info column only on phones', async () => {
    getVariantById.mockResolvedValue(variant({ description: 'Algodón suave de trama cerrada.' }));
    renderPage();

    const copies = await screen.findAllByText('Algodón suave de trama cerrada.');
    expect(copies).toHaveLength(2);
    const [underPhotos, inInfo] = copies.map(p => p.closest('.vdp-desc')!);
    expect(underPhotos).toHaveClass('vdp-desc--below-images', 'd-none', 'd-md-block');
    expect(underPhotos.parentElement!.querySelector('.vdp-img-container')).not.toBeNull();
    expect(inInfo).toHaveClass('d-md-none');
  });
});

describe('VariantDetailPage "Combina con"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVariantReviews.mockResolvedValue(reviewsPage([]));
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
    getVariantById.mockResolvedValue(variant());
    getVariantMatches.mockResolvedValue({ matches: [], matchedBy: [] });
  });

  it('lists the picked variants first, then the ones that picked this one, without repeats', async () => {
    const card = (id: number, name: string) => ({ id, name }) as never;
    getVariantMatches.mockResolvedValue({
      matches: [card(10, 'Cretona Rojo'), card(11, 'Cretona Azul')],
      matchedBy: [card(11, 'Cretona Azul'), card(20, 'Patchwork Flores')],
    });
    renderPage();

    expect(await screen.findByText('product.goesWith')).toBeInTheDocument();
    const names = ['Cretona Rojo', 'Cretona Azul', 'Patchwork Flores'].map(n => screen.getAllByText(n));
    expect(names.map(n => n.length)).toEqual([1, 1, 1]);
    expect(names[0][0].compareDocumentPosition(names[2][0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides the section when nothing goes with the variant', async () => {
    renderPage();

    await screen.findByText('Tela Azul');
    expect(screen.queryByText('product.goesWith')).not.toBeInTheDocument();
  });
});

describe('VariantDetailPage composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVariantReviews.mockResolvedValue(reviewsPage([]));
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
    fibreCodes.map = new Map([['algodón', 'CO'], ['elastano', 'EL']]);
  });

  it('links each fibre to its section of the fabric guide', async () => {
    guide.exists = true;
    getVariantById.mockResolvedValue(variant({ composition: '[{"material":"Algodón","percentage":95},{"material":"Elastano","percentage":5}]' }));
    renderPage();

    expect((await screen.findByText('Algodón')).closest('a')).toHaveAttribute('href', '/guia-de-tejidos#fibra-co');
    expect(screen.getByText('Elastano').closest('a')).toHaveAttribute('href', '/guia-de-tejidos#fibra-el');
  });

  it('shows plain names when the shop has no fabric guide', async () => {
    guide.exists = false;
    getVariantById.mockResolvedValue(variant({ composition: '[{"material":"Algodón","percentage":100}]' }));
    renderPage();

    const value = await screen.findByText('100% Algodón');
    expect(value.querySelector('a')).toBeNull();
  });

  it('shows the design among the fabric details', async () => {
    guide.exists = false;
    getVariantById.mockResolvedValue(variant({ pattern: 'Checks', colors: 'Red, White' }));
    renderPage();

    expect(await screen.findByText('fabricPatterns.Checks')).toBeInTheDocument();
    expect(screen.getByText('fabricColors.Red, fabricColors.White')).toBeInTheDocument();
    expect(screen.getByText('product.pattern')).toBeInTheDocument();
  });
});

describe('VariantDetailPage «Dejar una reseña» link (#reviews)', () => {
  let resize: () => void;
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getVariantReviews.mockResolvedValue(reviewsPage([]));
    getMyReview.mockResolvedValue({ hasPurchased: true, review: null });
    getVariantById.mockResolvedValue(variant());
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: () => void) { resize = cb; }
      observe() {}
      disconnect() { resize = () => {}; }
    });
  });

  const renderAtReviews = () => render(
    <MemoryRouter initialEntries={['/variant/1#reviews']}>
      <Routes><Route path="/variant/:id" element={<VariantDetailPage />} /></Routes>
    </MemoryRouter>,
  );

  it('scrolls to the reviews and keeps them in view while the rails above load', async () => {
    renderAtReviews();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('reviews'));

    resize();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('lets the shopper scroll away once they move the page themselves', async () => {
    renderAtReviews();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));

    fireEvent.wheel(window);
    resize();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

// Audit 2026-10-14: the thumbnail strip downloaded every original photo; it uses the small WebP.
describe('VariantDetailPage photos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVariantReviews.mockResolvedValue(reviewsPage([]));
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
  });

  it('shows the thumbnails in the strip and the original as the main photo', async () => {
    getVariantById.mockResolvedValue(variant({ images: [
      { url: 'https://img/1.jpg', thumbnailUrl: 'https://img/1.webp', isRealScale: false, altText: 'uno' },
      { url: 'https://img/2.jpg', thumbnailUrl: 'https://img/2.webp', isRealScale: false, altText: 'dos' },
    ] }));
    const { container } = renderPage();
    await screen.findByText('Tela Azul');

    const strip = [...container.querySelectorAll('.vdp-thumb img')] as HTMLImageElement[];
    expect(strip.map(i => i.getAttribute('src'))).toEqual(['https://img/1.webp', 'https://img/2.webp']);
    expect(strip[0]).toHaveAttribute('loading', 'lazy');
    expect(container.querySelector('.vdp-main-img')).toHaveAttribute('src', 'https://img/1.jpg');
  });

  it('shows the screen-size copy as the main photo when there is one', async () => {
    getVariantById.mockResolvedValue(variant({ images: [
      { url: 'https://img/1.jpg', thumbnailUrl: 'https://img/1.webp', displayUrl: 'https://img/1-display.webp', isRealScale: false, altText: 'uno' },
    ] }));
    const { container } = renderPage();
    await screen.findByText('Tela Azul');

    expect(container.querySelector('.vdp-main-img')).toHaveAttribute('src', 'https://img/1-display.webp');
  });
});

// 2026-10-26 (option A): a sale shows what a metre saves and the percentage under the price.
describe('VariantDetailPage sale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVariantReviews.mockResolvedValue(reviewsPage([]));
    getMyReview.mockResolvedValue({ hasPurchased: false, review: null });
  });

  it('says how much a metre saves and the percentage, rounded down', async () => {
    getVariantById.mockResolvedValue(variant({ price: 8.95, originalPrice: 11.95 }));
    const { container } = renderPage();
    await screen.findByText('Tela Azul');

    const saving = container.querySelector('.vdp-saving');
    expect(saving?.textContent?.replace(/\s/g, ' ')).toMatch(/^product\.saving\(3,00 €\)−25 ?%$/);
    expect(container.querySelector('.offer-badge')).toBeNull(); // the card label isn't repeated here
  });

  it('shows no saving line without a sale, nor for a group discount (it keeps its badge)', async () => {
    getVariantById.mockResolvedValue(variant());
    const { container, unmount } = renderPage();
    await screen.findByText('Tela Azul');
    expect(container.querySelector('.vdp-saving')).toBeNull();
    unmount();

    getVariantById.mockResolvedValue(variant({ price: 9, originalPrice: 10, discountPercent: 10 }));
    const second = renderPage();
    await screen.findByText('Tela Azul');
    expect(second.container.querySelector('.vdp-saving')).toBeNull();
    expect(screen.getByText('−10%')).toBeInTheDocument();
  });
});
