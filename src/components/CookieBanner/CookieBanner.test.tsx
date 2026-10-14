import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CookieBanner from './CookieBanner';
import { openCookieSettings } from './cookieSettings';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

// Audit 2026-10-14: optional cookies came pre-ticked (invalid consent), and once chosen there
// was no way to change or withdraw it.
describe('CookieBanner', () => {
  beforeEach(() => localStorage.clear());

  it('has the optional categories off until the visitor turns them on', () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'cookies.configure' }));

    for (const toggle of screen.getAllByRole('switch')) expect(toggle).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'cookies.savePreferences' }));
    expect(JSON.parse(localStorage.getItem('cookie_consent')!)).toEqual({ analytics: false, personalization: false });
  });

  it('opens again from «Configurar cookies» with the saved choice, and saves a new one', () => {
    localStorage.setItem('cookie_consent', JSON.stringify({ analytics: true, personalization: false }));
    render(<CookieBanner />);
    expect(screen.queryByRole('region')).toBeNull();

    act(() => openCookieSettings());

    const [analytics, personalization] = screen.getAllByRole('switch');
    expect(analytics).toBeChecked();
    expect(personalization).not.toBeChecked();
    fireEvent.click(analytics);
    fireEvent.click(screen.getByRole('button', { name: 'cookies.savePreferences' }));
    expect(JSON.parse(localStorage.getItem('cookie_consent')!)).toEqual({ analytics: false, personalization: false });
    expect(screen.queryByRole('region')).toBeNull();
  });
});
