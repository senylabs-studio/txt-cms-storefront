import apiClient from '../apiClient';

export type FooterColumnType = 'links' | 'logos' | 'features' | 'paymentMethods' | 'partners';

export interface FooterLink {
  text: string;
  href: string;
}

export interface FooterLogo {
  imageUrl: string;
  alt: string;
  href?: string;
}

export interface FooterFeature {
  icon: string;
  text: string;
}

export interface FooterColumn {
  title: string;
  type: FooterColumnType;
  isPredefined?: boolean;
  isVisible: boolean;
  links: FooterLink[];
  logos: FooterLogo[];
  features: FooterFeature[];
}

/** "HH:mm", Madrid local time. */
export interface OpeningHoursRange {
  open: string;
  close: string;
}

/** `day`: 0 = Sunday … 6 = Saturday. A day that isn't listed is closed. */
export interface OpeningHoursDay {
  day: number;
  ranges: OpeningHoursRange[];
}

export interface SiteSettings {
  siteName: string;
  logoUrl?: string;
  brandColor?: string;
  siteDescription: string;
  copyright: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tikTokUrl?: string;
  pinterestUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  linkedInUrl?: string;
  footerColumns: FooterColumn[];
  openingHours?: OpeningHoursDay[];
}

export const getSiteSettings = (): Promise<SiteSettings> =>
  apiClient.get('/storefront/site-settings').then(r => r.data);
