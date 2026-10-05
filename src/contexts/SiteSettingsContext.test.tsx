import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SiteSettingsProvider, useSiteSettings } from './SiteSettingsContext';

const lang = vi.hoisted(() => ({ current: 'es' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: lang.current } }) }));
const api = vi.hoisted(() => ({ getSiteSettings: vi.fn() }));
vi.mock('../services/siteSettingsService', () => api);

const Probe = () => <span>{useSiteSettings().footerColumns[0]?.title ?? '-'}</span>;

describe('SiteSettingsProvider', () => {
  beforeEach(() => vi.clearAllMocks());

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
