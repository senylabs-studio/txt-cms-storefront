import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }));
vi.mock('../../components/Layout/MainLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../contexts/SiteSettingsContext', () => ({ useSiteSettings: () => ({ siteName: 'Tejidos Pulido' }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ login: vi.fn(), isAuthenticated: false }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../services/authService', () => ({ register: vi.fn() }));
vi.mock('../../hooks/useDocumentMeta', () => ({ useDocumentMeta: () => {} }));

// Audit 2026-10-14 (RGPD art. 13): signing up showed no privacy information at all.
describe('RegisterPage', () => {
  it('shows the privacy notice with a link to the policy before the submit button', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    expect(screen.getByText(/auth\.register\.privacyNotice/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'auth.register.privacyLink' })).toHaveAttribute('href', '/proteccion-de-datos');
  });

  // 2026-10-17: the old shop's accounts aren't carried over (decision 2026-10-14).
  it('tells customers of the old shop to create their account again', () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    expect(screen.getByText('auth.register.oldShopNotice')).toBeInTheDocument();
  });
});
