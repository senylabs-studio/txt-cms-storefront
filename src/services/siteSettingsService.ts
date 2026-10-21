import apiClient from '../apiClient';

/** 'contact' shows the shop's address, phone, email and opening hours from the settings. */
export type FooterColumnType = 'links' | 'logos' | 'features' | 'paymentMethods' | 'partners' | 'contact';

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
  /** Browser-tab icon; empty = the built-in neutral one. */
  faviconUrl?: string;
  brandColor?: string;
  siteDescription: string;
  copyright: string;
  /** The shop's address: shown for "Recogida en tienda" at checkout. */
  companyAddress?: string;
  companyPostalCode?: string;
  companyCity?: string;
  companyPhone?: string;
  companyEmail?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tikTokUrl?: string;
  pinterestUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  linkedInUrl?: string;
  footerColumns: FooterColumn[];
  openingHours?: OpeningHoursDay[];
  /** The checkout offers «Pagar por transferencia» (switched on in the CMS, with an IBAN). */
  bankTransferAvailable?: boolean;
}

export const getSiteSettings = (): Promise<SiteSettings> =>
  apiClient.get('/storefront/site-settings').then(r => r.data);
