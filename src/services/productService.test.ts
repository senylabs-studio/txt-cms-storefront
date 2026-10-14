import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getVariantsPaged } from './productService';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../apiClient', () => ({ default: api }));

// Audit 2026-10-14: the header's suggestions ran the catalogue's facet pass on every keystroke.
describe('getVariantsPaged', () => {
  beforeEach(() => api.get.mockResolvedValue({ data: { items: [] } }));

  it('asks the API to skip the facets only when told', async () => {
    await getVariantsPaged(1, 6, 'lino', undefined, 'name', 'asc', {}, false);
    expect(api.get.mock.calls[0][1].params.facets).toBe(false);

    await getVariantsPaged(1, 12, 'lino');
    expect(api.get.mock.calls[1][1].params.facets).toBeUndefined();
  });
});
