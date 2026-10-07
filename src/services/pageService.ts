import apiClient from '../apiClient';
import type { StorefrontMenuItem, StorefrontPageDetail } from '../types';
import type { FabricPattern } from '../utils/fabricPatterns';

export interface PageFilters {
  minPrice?: number;
  maxPrice?: number;
  width?: number;
  material?: string;
  /** "Diseño" filter. */
  pattern?: FabricPattern;
  orderBy?: string;
  /** Only products still showing the "Nuevo" badge. */
  onlyNew?: boolean;
  /** Only variants sold below their original price. */
  onlyOffers?: boolean;
}

export const getMenu = async (): Promise<StorefrontMenuItem[]> => {
  const res = await apiClient.get('/storefront/menu');
  return res.data;
};

export const getPageBySlug = async (
  slug: string,
  page = 1,
  pageSize = 12,
  filters: PageFilters = {},
  /** "Ver todos": a category page's products and those of every subpage under it. */
  all = false
): Promise<StorefrontPageDetail> => {
  const params: Record<string, string | number> = { page, pageSize };
  if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
  if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
  if (filters.width !== undefined) params.width = filters.width;
  if (filters.material) params.material = filters.material;
  if (filters.pattern) params.pattern = filters.pattern;
  if (filters.orderBy) params.orderBy = filters.orderBy;
  if (filters.onlyNew) params.onlyNew = 'true';
  if (filters.onlyOffers) params.onlyOffers = 'true';
  if (all) params.all = 'true';
  const res = await apiClient.get(`/storefront/pages/${slug}`, { params });
  return res.data;
};
