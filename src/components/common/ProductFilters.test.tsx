import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductFilters from './ProductFilters';
import type { PageFilterFacets } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const facets = (patterns?: PageFilterFacets['patterns']): PageFilterFacets =>
  ({ minPrice: 5, maxPrice: 20, widths: [140, 280], materials: ['Algodón'], patterns });

describe('ProductFilters — Diseño', () => {
  it('offers only the designs the page has, and applies the chosen one', () => {
    const onChange = vi.fn();
    render(<ProductFilters facets={facets(['Plain', 'Stripes'])} filters={{}} onChange={onChange} onClose={vi.fn()} />);

    const select = screen.getByLabelText('filters.pattern');
    expect(Array.from((select as HTMLSelectElement).options).map(o => o.value)).toEqual(['', 'Plain', 'Stripes']);
    expect(screen.getByText('fabricPatterns.Stripes')).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'Stripes' } });
    fireEvent.click(screen.getByText('filters.viewResults'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ pattern: 'Stripes' }));
  });

  it('has no design filter when no item on the page is classified', () => {
    render(<ProductFilters facets={facets([])} filters={{}} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('filters.pattern')).toBeNull();
  });
});
