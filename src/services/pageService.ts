import apiClient from '../apiClient';
import type { StorefrontMenuItem, StorefrontPageDetail } from '../types';

export interface PageFilters {
  minPrice?: number;
  maxPrice?: number;
  width?: number;
  material?: string;
  orderBy?: string;
}

export const getMenu = async (): Promise<StorefrontMenuItem[]> => {
  const res = await apiClient.get('/storefront/menu');
  return res.data;
};

export const getPageBySlug = async (
  slug: string,
  page = 1,
  pageSize = 12,
  filters: PageFilters = {}
): Promise<StorefrontPageDetail> => {
  const params: Record<string, string | number> = { page, pageSize };
  if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
  if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
  if (filters.width !== undefined) params.width = filters.width;
  if (filters.material) params.material = filters.material;
  if (filters.orderBy) params.orderBy = filters.orderBy;
  const res = await apiClient.get(`/storefront/pages/${slug}`, { params });
  return res.data;
};
