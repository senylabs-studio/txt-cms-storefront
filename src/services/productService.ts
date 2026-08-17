import apiClient from '../apiClient';
import type { PaginatedResponse, StorefrontProduct, StorefrontVariant, StorefrontVariantDetail } from '../types';

export const getProductBySlug = async (slug: string): Promise<StorefrontProduct> => {
  const res = await apiClient.get(`/storefront/products/${slug}`);
  return res.data;
};

export const getVariantsPaged = async (
  page = 1, pageSize = 12, search = '', productTypeId?: number, orderBy = 'name', orderDir = 'asc'
): Promise<PaginatedResponse<StorefrontVariant>> => {
  const res = await apiClient.get('/storefront/products/variants', {
    params: { page, pageSize, search, productTypeId, orderBy, orderDir }
  });
  return res.data;
};

export const getVariantById = async (variantId: number): Promise<StorefrontVariantDetail> => {
  const res = await apiClient.get(`/storefront/products/variants/${variantId}`);
  return res.data;
};
