import apiClient from '../apiClient';
import type { MyReviewStatus, PaginatedResponse, ProductReview } from '../types';

// Reviews are per variant (the exact fabric/colour bought).
export const getVariantReviews = async (
  variantId: number, page = 1, pageSize = 10,
): Promise<PaginatedResponse<ProductReview> & { averageRating: number | null; reviewCount: number }> => {
  const res = await apiClient.get(`/storefront/products/variants/${variantId}/reviews`, { params: { page, pageSize } });
  return res.data;
};

export const getMyReview = async (variantId: number): Promise<MyReviewStatus> => {
  const res = await apiClient.get(`/storefront/products/variants/${variantId}/reviews/mine`);
  return res.data;
};

export const submitReview = async (variantId: number, rating: number, comment?: string): Promise<ProductReview> => {
  const res = await apiClient.post(`/storefront/products/variants/${variantId}/reviews`, { rating, comment });
  return res.data;
};
