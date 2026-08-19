import apiClient from '../apiClient';
import type { MyReviewStatus, PaginatedResponse, ProductReview } from '../types';

export const getProductReviews = async (
  productSlug: string, page = 1, pageSize = 10,
): Promise<PaginatedResponse<ProductReview> & { averageRating: number | null; reviewCount: number }> => {
  const res = await apiClient.get(`/storefront/products/${productSlug}/reviews`, { params: { page, pageSize } });
  return res.data;
};

export const getMyReview = async (productSlug: string): Promise<MyReviewStatus> => {
  const res = await apiClient.get(`/storefront/products/${productSlug}/reviews/mine`);
  return res.data;
};

export const submitReview = async (productSlug: string, rating: number, comment?: string): Promise<ProductReview> => {
  const res = await apiClient.post(`/storefront/products/${productSlug}/reviews`, { rating, comment });
  return res.data;
};
