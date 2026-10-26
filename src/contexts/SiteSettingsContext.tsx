import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSiteSettings, type SiteSettings } from '../services/siteSettingsService';
import { applyFavicon } from '../utils/favicon';
import { pageData, reportStalePageData } from '../utils/pageData';
export type { SiteSettings };

const DEFAULT_BRAND_COLOR = '#06b773';

const DEFAULT: SiteSettings = {
  siteName: 'TXT Shop',
  logoUrl: '',
  brandColor: DEFAULT_BRAND_COLOR,
  siteDescription: '',
  copyright: '',
  footerColumns: [],
};

const SiteSettingsContext = createContext<SiteSettings>(DEFAULT);

const isSettings = (data: unknown) => !!data && typeof data === 'object' && !Array.isArray(data);
const fromPage = (language: string) => pageData<Partial<SiteSettings>>('site-settings', language, isSettings);

const apply = (settings: SiteSettings) => {
  document.documentElement.style.setProperty('--brand-color', settings.brandColor || DEFAULT_BRAND_COLOR);
  applyFavicon(settings.faviconUrl);
};

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  // From the copy the server put in the page: the header paints with the logo, name and colour
  // instead of the defaults while the API is asked (2026-10-26).
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const copy = fromPage(i18n.language);
    return copy ? { ...DEFAULT, ...copy } : DEFAULT;
  });

  // Before the first paint: the brand colour is a CSS variable.
  useLayoutEffect(() => {
    if (fromPage(i18n.language)) apply(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the first paint
  }, []);

  // Re-fetched on a language switch: the footer, description and copyright come translated
  // (X-Language) when the CMS has a translation for them.
  useEffect(() => {
    let cancelled = false;
    getSiteSettings()
      .then(data => {
        if (cancelled) return;
        const copy = fromPage(i18n.language);
        if (copy && JSON.stringify(copy) !== JSON.stringify(data)) reportStalePageData();
        const merged = { ...DEFAULT, ...data };
        setSettings(merged);
        apply(merged);
      })
      .catch(() => {/* keep what we have (the page copy, or the defaults) */});
    return () => { cancelled = true; };
  }, [i18n.language]);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => useContext(SiteSettingsContext);
