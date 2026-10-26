import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SiteSettingsProvider, useSiteSettings } from './SiteSettingsContext';

const lang = vi.hoisted(() => ({ current: 'es' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: lang.current } }) }));
const api = vi.hoisted(() => ({ getSiteSettings: vi.fn() }));
vi.mock('../services/siteSettingsService', () => api);

const Probe = () => <span>{useSiteSettings().footerColumns[0]?.title ?? '-'}</span>;
const Logo = () => <span>{useSiteSettings().logoUrl || 'sin logo'}</span>;

const putCopy = (lang: string, settings: object) => {
  const el = document.createElement('script');
  el.id = 'site-settings';
  el.type = 'application/json';
  el.setAttribute('data-lang', lang);
  el.textContent = JSON.stringify(settings);
  document.head.appendChild(el);
};

describe('SiteSettingsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    lang.current = 'es';
    document.getElementById('site-settings')?.remove();
  });

  // 2026-10-26: the header showed «TXT Shop» until the API answered; a CMS change reaches the copy at once.
  it('paints with the copy the server put in the page, and tells the server when the API has a newer one', async () => {
    putCopy('es', { siteName: 'TP', logoUrl: 'https://cdn/viejo.png', brandColor: '#123456', footerColumns: [] });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    let answer: (v: object) => void = () => {};
    api.getSiteSettings.mockReturnValue(new Promise(r => { answer = r; }));
    const { SiteSettingsProvider: Provider, useSiteSettings: use } = await import('./SiteSettingsContext');
    const PageLogo = () => <span>{use().logoUrl}</span>;

    render(<Provider><PageLogo /></Provider>);
    expect(screen.getByText('https://cdn/viejo.png')).toBeInTheDocument(); // before the API answers
    expect(document.documentElement.style.getPropertyValue('--brand-color')).toBe('#123456');

    answer({ siteName: 'TP', logoUrl: 'https://cdn/nuevo.png', brandColor: '#123456', footerColumns: [] });
    expect(await screen.findByText('https://cdn/nuevo.png')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/__refresh', expect.objectContaining({ method: 'POST' }));
    vi.unstubAllGlobals();
  });

  it('uses the defaults without a copy, and does not bother the server when nothing changed', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    api.getSiteSettings.mockResolvedValue({ siteName: 'TP', logoUrl: 'https://cdn/logo.png', footerColumns: [] });
    render(<SiteSettingsProvider><Logo /></SiteSettingsProvider>);
    expect(screen.getByText('sin logo')).toBeInTheDocument();
    expect(await screen.findByText('https://cdn/logo.png')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  // The footer comes translated from the backend (X-Language): switching language must re-fetch it.
  it('fetches the settings again when the language changes', async () => {
    api.getSiteSettings
      .mockResolvedValueOnce({ siteName: 'TP', footerColumns: [{ title: 'Ayuda y contacto' }] })
      .mockResolvedValueOnce({ siteName: 'TP', footerColumns: [{ title: 'Ajuda i contacte' }] });
    const { rerender } = render(<SiteSettingsProvider><Probe /></SiteSettingsProvider>);
    expect(await screen.findByText('Ayuda y contacto')).toBeInTheDocument();

    lang.current = 'ca';
    rerender(<SiteSettingsProvider><Probe /></SiteSettingsProvider>);

    expect(await screen.findByText('Ajuda i contacte')).toBeInTheDocument();
    await waitFor(() => expect(api.getSiteSettings).toHaveBeenCalledTimes(2));
  });
});
