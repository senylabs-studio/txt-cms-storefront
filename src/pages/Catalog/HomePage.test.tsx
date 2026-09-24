import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import type { StorefrontVariant } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}));
vi.mock('../../components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../components/common/ProductFilters', () => ({ default: () => <div /> }));
vi.mock('../../components/Product/VariantCard/VariantCard', () => ({
  default: ({ variant }: { variant: { name: string } }) => <div>{variant.name}</div>,
}));
vi.mock('../../contexts/SiteSettingsContext', () => ({ useSiteSettings: () => ({ siteName: 'TXT Shop', siteDescription: '' }) }));
vi.mock('../../hooks/useDocumentMeta', () => ({ useDocumentMeta: () => {} }));
// No debounce delay, so each keystroke is its own request in flight.
vi.mock('../../hooks/useDebounce', () => ({ default: <T,>(value: T) => value }));

const { getVariantsPaged } = vi.hoisted(() => ({ getVariantsPaged: vi.fn() }));
vi.mock('../../services/productService', () => ({ getVariantsPaged }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

const pageOf = (name: string) => ({
  items: [{ id: name.length, name } as unknown as StorefrontVariant],
  totalItems: 1, totalPages: 1, facets: { minPrice: 0, maxPrice: 0, widths: [], materials: [] },
});

describe('HomePage catalog', () => {
  beforeEach(() => vi.clearAllMocks());

  // Regression test: typing/filtering fires overlapping requests; a slower response for an
  // older search used to land last and replace the results for what's actually typed.
  it('ignores a slower response for a search that is no longer current', async () => {
    const all = deferred<ReturnType<typeof pageOf>>();
    const lino = deferred<ReturnType<typeof pageOf>>();
    getVariantsPaged.mockImplementation((_p: number, _s: number, search: string) => (search === 'lino' ? lino.promise : all.promise));
    render(<MemoryRouter><HomePage /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('catalog.home.searchPlaceholder'), { target: { value: 'lino' } });
    lino.resolve(pageOf('Lino Natural'));
    expect(await screen.findByText('Lino Natural')).toBeInTheDocument();

    all.resolve(pageOf('Algodón Blanco'));
    await new Promise(r => setTimeout(r, 0));

    expect(screen.getByText('Lino Natural')).toBeInTheDocument();
    expect(screen.queryByText('Algodón Blanco')).not.toBeInTheDocument();
  });
});
