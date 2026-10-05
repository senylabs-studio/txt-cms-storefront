import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSiteSettings, type SiteSettings } from '../services/siteSettingsService';
import { applyFavicon } from '../utils/favicon';
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

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT);
  const { i18n } = useTranslation();

  // Re-fetched on a language switch: the footer, description and copyright come translated
  // (X-Language) when the CMS has a translation for them.
  useEffect(() => {
    let cancelled = false;
    getSiteSettings()
      .then(data => {
        if (cancelled) return;
        const merged = { ...DEFAULT, ...data };
        setSettings(merged);
        const color = merged.brandColor || DEFAULT_BRAND_COLOR;
        document.documentElement.style.setProperty('--brand-color', color);
        applyFavicon(merged.faviconUrl);
      })
      .catch(() => {/* keep what we have (the defaults on first load) */});
    return () => { cancelled = true; };
  }, [i18n.language]);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => useContext(SiteSettingsContext);
