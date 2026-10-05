import apiClient from '../apiClient';

export type StorefrontHomeBlockType = 'Banner' | 'ImageGrid' | 'FeaturedProducts' | 'ImageText' | 'Features' | 'Newsletter';

export interface HomeBannerSlide {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  textAlign?: 'left' | 'center' | 'right';
  textVerticalAlign?: 'top' | 'middle' | 'bottom';
  textColor?: string;
}

export interface HomeBannerBlockConfig {
  slides: HomeBannerSlide[];
  height?: number;
  intervalSeconds?: number;
  backgroundColor?: string;
}

export interface HomeImageGridImage {
  imageUrl: string;
  caption?: string;
  linkUrl?: string;
}

export interface HomeImageGridBlockConfig {
  title?: string;
  images: HomeImageGridImage[];
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
}

/** The storefront's home-blocks endpoint resolves variantIds/productIds server-side
 *  into these full item objects, unlike the CMS admin's raw-id config shape. */
export interface HomeFeaturedItem {
  id: number;
  name: string;
  slug?: string;
  price: number;
  originalPrice: number;
  discountPercent?: number;
  availableStock: number;
  thumbnailUrl?: string;
  imageUrls?: string[];
  hasVariants?: boolean;
}

export interface HomeFeaturedProductsBlockConfig {
  title?: string;
  variants?: HomeFeaturedItem[];
  products?: HomeFeaturedItem[];
  /** Offers mode ('offers'): the variants are a random pick of those on sale, chosen by the backend. */
  source?: 'manual' | 'offers' | 'new';
  /** Offers mode: link to the Ofertas page, set by the backend only while that page is visible. */
  offersUrl?: string | null;
  /** Offers mode: text for that link; empty = the default "see all offers". */
  buttonText?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
}

export interface HomeImageTextBlockConfig {
  imageUrl?: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title?: string;
  text?: string;
  imagePosition?: 'left' | 'right';
  buttonText?: string;
  buttonUrl?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  /** Optional touches set in the CMS (same for every language). */
  decoration?: {
    /** Edge between photo and text cut like pinking shears. */
    pinking?: boolean;
    /** Scissors on a dashed "cut here" line along the bottom of the text side. */
    cutLine?: boolean;
    /** The eyebrow on a cardboard tag. */
    tag?: boolean;
  };
}

/** Icons a Features item can show (keys shared with the CMS's FEATURE_ICONS). */
export type HomeFeatureIcon = 'truck' | 'return' | 'lock' | 'scissors' | 'store' | 'gift' | 'phone' | 'ruler' | 'leaf' | 'star' | 'card' | 'clock';

export interface HomeFeatureItem {
  id?: string;
  icon?: HomeFeatureIcon;
  title?: string;
  text?: string;
  /** Optional: the whole item links here (page links are resolved by the backend). */
  linkUrl?: string;
}

/** Strip of selling points (free shipping, returns, secure payment…), right under the banner. */
export interface HomeFeaturesBlockConfig {
  items: HomeFeatureItem[];
  backgroundColor?: string;
  textColor?: string;
}

/** Newsletter sign-up box. Empty texts fall back to the storefront's defaults. */
export interface HomeNewsletterBlockConfig {
  title?: string;
  text?: string;
  buttonText?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface HomeBlockConfigMap {
  Banner: HomeBannerBlockConfig;
  ImageGrid: HomeImageGridBlockConfig;
  FeaturedProducts: HomeFeaturedProductsBlockConfig;
  ImageText: HomeImageTextBlockConfig;
  Features: HomeFeaturesBlockConfig;
  Newsletter: HomeNewsletterBlockConfig;
}

export type HomeBlockConfig = HomeBlockConfigMap[StorefrontHomeBlockType];

/** Distributed so `block.type` correctly narrows `block.config`'s shape. */
export type StorefrontHomeBlock = {
  [K in StorefrontHomeBlockType]: {
    id: number;
    title: string;
    type: K;
    config: HomeBlockConfigMap[K];
    isActive: boolean;
    sortOrder: number;
  };
}[StorefrontHomeBlockType];

export const getHomeBlocks = (): Promise<StorefrontHomeBlock[]> =>
  apiClient.get('/storefront/home').then(r => r.data);
