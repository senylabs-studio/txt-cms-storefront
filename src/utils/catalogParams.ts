import type { PageFilters } from '../services/pageService';
import { parseFabricPattern } from './fabricPatterns';
import { parseFabricColors } from './fabricColors';

/** /catalog?novedades=1 opens the catalog with the "only new" filter on (the home block's
 *  "see all new arrivals" link). */
export const NEW_ARRIVALS_PARAM = 'novedades';

/** Catalog filters kept in the URL, so Back and shared links show the same list. */
export const FILTER_PARAMS = ['minPrice', 'maxPrice', 'width', 'material', 'pattern', 'colors', 'orderBy', 'onlyNew', 'onlyOffers'] as const;

const numberParam = (params: URLSearchParams, name: string): number | undefined => {
  const raw = params.get(name);
  if (raw === null || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
};

export const filtersFromParams = (params: URLSearchParams): PageFilters => {
  const filters: PageFilters = {};
  const minPrice = numberParam(params, 'minPrice');
  const maxPrice = numberParam(params, 'maxPrice');
  const width = numberParam(params, 'width');
  if (minPrice !== undefined) filters.minPrice = minPrice;
  if (maxPrice !== undefined) filters.maxPrice = maxPrice;
  if (width !== undefined) filters.width = width;
  if (params.get('material')) filters.material = params.get('material')!;
  const pattern = parseFabricPattern(params.get('pattern'));
  if (pattern) filters.pattern = pattern;
  const colors = parseFabricColors(params.get('colors'));
  if (colors.length) filters.colors = colors;
  if (params.get('orderBy')) filters.orderBy = params.get('orderBy')!;
  if (params.get('onlyNew') === '1') filters.onlyNew = true;
  if (params.get('onlyOffers') === '1') filters.onlyOffers = true;
  return filters;
};

export const writeFilterParams = (params: URLSearchParams, f: PageFilters) => {
  for (const name of FILTER_PARAMS) params.delete(name);
  if (f.minPrice !== undefined) params.set('minPrice', String(f.minPrice));
  if (f.maxPrice !== undefined) params.set('maxPrice', String(f.maxPrice));
  if (f.width !== undefined) params.set('width', String(f.width));
  if (f.material) params.set('material', f.material);
  if (f.pattern) params.set('pattern', f.pattern);
  if (f.colors?.length) params.set('colors', f.colors.join(','));
  if (f.orderBy) params.set('orderBy', f.orderBy);
  if (f.onlyNew) params.set('onlyNew', '1');
  if (f.onlyOffers) params.set('onlyOffers', '1');
};
