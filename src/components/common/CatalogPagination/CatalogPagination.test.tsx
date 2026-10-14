import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CatalogPagination from './CatalogPagination';

// Audit 2026-10-14: page numbers were buttons, so crawlers never reached the products past page 1.
describe('CatalogPagination', () => {
  it('renders real links that keep the other filters, and handles the click in place', () => {
    const onChange = vi.fn();
    render(
      <MemoryRouter initialEntries={['/cortinas?colors=Blue&pagina=2']}>
        <CatalogPagination currentPage={2} totalPages={3} onChange={onChange} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('href', '/cortinas?colors=Blue&pagina=3');
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('href', '/cortinas?colors=Blue');
    fireEvent.click(screen.getByRole('link', { name: '3' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
