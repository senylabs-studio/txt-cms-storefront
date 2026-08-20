import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
vi.mock('../../../components/common/NotifyMeButton/NotifyMeButton', () => ({ default: () => <div /> }));
vi.mock('../../../components/common/CareLabels', () => ({ default: () => <div /> }));
vi.mock('../../../components/Product/VariantCard/VariantCard', () => ({ default: () => <div /> }));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const mockAuth = vi.hoisted(() => ({ isAuthenticated: true }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));

const mockCart = vi.hoisted(() => ({ addItem: vi.fn(), loading: false }));
vi.mock('../../../contexts/CartContext', () => ({ useCart: () => mockCart }));

vi.mock('../../../contexts/SiteSettingsContext', () => ({ useSiteSettings: () => ({ siteName: 'TXT Shop' }) }));

const { getVariantById } = vi.hoisted(() => ({ getVariantById: vi.fn() }));
vi.mock('../../../services/productService', () => ({ getVariantById }));

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
  availableStock: 5, typeValue: 'Azul', imageUrls: [], productId: 1, productName: 'Tela', productSlug: 'tela',
  width: 0, weight: 0, composition: '', productTypeName: '', siblings: [], reviewCount: 0,
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
