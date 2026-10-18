import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../components/Layout/MainLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

// 2026-10-18: an unknown address with more than one segment (an old ePages link) redirected to
// the home page instead of saying it doesn't exist.
describe('NotFoundPage', () => {
  it('says the page does not exist, with a way home', () => {
    render(
      <MemoryRouter initialEntries={['/epages/shop.sf/es_ES/']}>
        <Routes><Route path="*" element={<NotFoundPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('catalog.notFound')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'notFound.home' }).getAttribute('href')).toBe('/');
  });
});
