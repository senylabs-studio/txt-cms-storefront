import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileMenuSheet from './MobileMenuSheet';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es', changeLanguage: vi.fn() } }),
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false, logout: vi.fn() }) }));
vi.mock('../../../services/pageService', () => ({ getMenu: () => Promise.resolve([]) }));
vi.mock('../../../services/languageService', () => ({ getLanguages: () => Promise.resolve([]) }));

describe('MobileMenuSheet', () => {
  // The sheet lives inside the sticky header's stacking context, so the floating chat button
  // would cover the open menu; the body class lets ChatWidget.css hide it meanwhile.
  it('marks the body while open, so the chat button hides, and unmarks it when closed', () => {
    const { rerender } = render(<MemoryRouter><MobileMenuSheet open onClose={() => {}} /></MemoryRouter>);
    expect(document.body.classList.contains('mobile-menu-open')).toBe(true);

    rerender(<MemoryRouter><MobileMenuSheet open={false} onClose={() => {}} /></MemoryRouter>);
    expect(document.body.classList.contains('mobile-menu-open')).toBe(false);
  });
});
