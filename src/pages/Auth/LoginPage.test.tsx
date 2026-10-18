import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }));
vi.mock('../../components/Layout/MainLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../contexts/SiteSettingsContext', () => ({ useSiteSettings: () => ({ siteName: 'Tejidos Pulido' }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ login: vi.fn(), isAuthenticated: false }) }));
vi.mock('../../services/authService', () => ({ login: vi.fn() }));
vi.mock('../../hooks/useDocumentMeta', () => ({ useDocumentMeta: () => {} }));

// 2026-10-17: the old shop's accounts aren't carried over (decision 2026-10-14): someone trying
// their old login is told to create the account again.
describe('LoginPage', () => {
  it('tells customers of the old shop to create their account again, with a link', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByText(/auth\.login\.oldShopNotice/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'auth.login.oldShopLink' })).toHaveAttribute('href', '/register');
  });

  // 2026-10-18: the labels weren't tied to their fields (no controlId), so a screen reader
  // announced two unnamed text boxes.
  it('names its fields by their labels', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByLabelText('auth.login.email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('auth.login.password')).toHaveAttribute('type', 'password');
  });
});
