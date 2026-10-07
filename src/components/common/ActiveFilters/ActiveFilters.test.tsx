import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActiveFilters from './ActiveFilters';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, string>) => (o ? `${key}(${Object.values(o).join(',')})` : key) }),
}));

describe('ActiveFilters', () => {
  it('shows nothing when no filter is on', () => {
    const { container } = render(<ActiveFilters filters={{}} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows one chip per filter and removes only that one', () => {
    const onChange = vi.fn();
    render(<ActiveFilters filters={{ pattern: 'Stripes', width: 140, onlyOffers: true, minPrice: 5, maxPrice: 20 }} onChange={onChange} />);

    expect(screen.getByText('filters.pattern: fabricPatterns.Stripes')).toBeInTheDocument();
    expect(screen.getByText('filters.width: 140 cm')).toBeInTheDocument();
    expect(screen.getByText('filters.price: 5 € – 20 €')).toBeInTheDocument();
    expect(screen.getByText('filters.onlyOffers')).toBeInTheDocument();

    fireEvent.click(screen.getByText('filters.width: 140 cm'));
    expect(onChange).toHaveBeenLastCalledWith({ pattern: 'Stripes', onlyOffers: true, minPrice: 5, maxPrice: 20 });

    fireEvent.click(screen.getByText('filters.price: 5 € – 20 €'));
    expect(onChange).toHaveBeenLastCalledWith({ pattern: 'Stripes', width: 140, onlyOffers: true });
  });

  it('"remove all" clears every filter, and only shows with two or more', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ActiveFilters filters={{ onlyNew: true }} onChange={onChange} />);
    expect(screen.queryByText('filters.clearAll')).toBeNull();

    rerender(<ActiveFilters filters={{ onlyNew: true, material: 'Lino' }} onChange={onChange} />);
    fireEvent.click(screen.getByText('filters.clearAll'));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('shows an open price range as "from" / "up to"', () => {
    render(<ActiveFilters filters={{ minPrice: 8 }} onChange={vi.fn()} />);
    expect(screen.getByText('filters.price: filters.from(8 €)')).toBeInTheDocument();
  });
});
