import React, { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    getSiteSettings()
      .then(data => {
        const merged = { ...DEFAULT, ...data };
        setSettings(merged);
        const color = merged.brandColor || DEFAULT_BRAND_COLOR;
        document.documentElement.style.setProperty('--brand-color', color);
        applyFavicon(merged.faviconUrl);
      })
      .catch(() => {/* use defaults */});
  }, []);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => useContext(SiteSettingsContext);
