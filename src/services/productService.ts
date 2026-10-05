import apiClient from '../apiClient';
import type { PaginatedResponse, StorefrontProduct, StorefrontVariant, StorefrontVariantDetail } from '../types';
import type { PageFilters } from './pageService';

export const getProductBySlug = async (slug: string): Promise<StorefrontProduct> => {
  const res = await apiClient.get(`/storefront/products/${slug}`);
  return res.data;
};

export const getVariantsPaged = async (
  page = 1, pageSize = 12, search = '', productTypeId?: number, orderBy = 'name', orderDir = 'asc',
  filters: PageFilters = {}
): Promise<PaginatedResponse<StorefrontVariant>> => {
  const res = await apiClient.get('/storefront/products/variants', {
    params: {
      page, pageSize, search, productTypeId, orderBy, orderDir,
      minPrice: filters.minPrice, maxPrice: filters.maxPrice, width: filters.width, material: filters.material,
      onlyNew: filters.onlyNew || undefined,
    }
  });
  return res.data;
};

export const getVariantById = async (variantId: number): Promise<StorefrontVariantDetail> => {
  const res = await apiClient.get(`/storefront/products/variants/${variantId}`);
  return res.data;
};

// "Combina con": the variants picked for this one in the CMS (e.g. a print's Cretona lisa colours)
// and, the other way round, the ones that picked it. Already visible-only and in display order.
export const getVariantMatches = async (variantId: number): Promise<{ matches: StorefrontVariant[]; matchedBy: StorefrontVariant[] }> => {
  const res = await apiClient.get(`/storefront/products/variants/${variantId}/matches`);
  return res.data;
};

export const getVariantsBatch = async (variantIds: number[]): Promise<StorefrontVariant[]> => {
  if (variantIds.length === 0) return [];
  const res = await apiClient.get('/storefront/products/variants/batch', {
    params: { ids: variantIds.join(',') },
  });
  return res.data;
};
