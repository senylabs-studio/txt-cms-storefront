import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductFilters from './ProductFilters';
import type { PageFilterFacets } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const facets = (patterns?: PageFilterFacets['patterns']): PageFilterFacets =>
  ({ minPrice: 5, maxPrice: 20, widths: [140, 280], materials: ['Algodón'], patterns });

describe('ProductFilters — Diseño and offers', () => {
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

  it('offers "only on sale" when the page has offers, and applies it', () => {
    const onChange = vi.fn();
    render(<ProductFilters facets={{ ...facets(), hasOffers: true }} filters={{}} onChange={onChange} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('filters.onlyOffers'));
    fireEvent.click(screen.getByText('filters.viewResults'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ onlyOffers: true }));
  });

  it('has no "only on sale" switch when nothing on the page is on sale', () => {
    render(<ProductFilters facets={facets()} filters={{}} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('filters.onlyOffers')).toBeNull();
  });

  it('offers a swatch per colour present and applies several at once', () => {
    const onChange = vi.fn();
    render(<ProductFilters facets={{ ...facets(), colors: ['Red', 'Blue', 'White'] }} filters={{}} onChange={onChange} onClose={vi.fn()} />);
    expect(screen.getAllByRole('button', { pressed: false }).map(b => b.getAttribute('aria-label')))
      .toEqual(['fabricColors.Red', 'fabricColors.Blue', 'fabricColors.White']);
    fireEvent.click(screen.getByLabelText('fabricColors.Blue'));
    fireEvent.click(screen.getByLabelText('fabricColors.Red'));
    fireEvent.click(screen.getByText('filters.viewResults'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ colors: ['Blue', 'Red'] }));
  });
});

// Audit 2026-10-09: sort, width and composition selects and the price sliders had no accessible name.
describe('ProductFilters — accessible names', () => {
  it('names every select and both price sliders', () => {
    render(<ProductFilters facets={{ ...facets(['Plain']), widths: [140, 150], materials: ['Algodón'], minPrice: 1, maxPrice: 50 }} filters={{}} onChange={vi.fn()} />);

    for (const name of ['filters.sortBy', 'filters.pattern', 'filters.width', 'filters.composition'])
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'filters.priceMin' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'filters.priceMax' })).toBeInTheDocument();
  });
});
