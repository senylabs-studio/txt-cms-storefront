import apiClient from '../apiClient';

export type StorefrontHomeBlockType = 'Banner' | 'ImageGrid' | 'FeaturedProducts' | 'ImageText';

export interface HomeBannerSlide {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
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
  backgroundColor?: string;
}

export interface HomeImageTextBlockConfig {
  imageUrl?: string;
  title?: string;
  text?: string;
  imagePosition?: 'left' | 'right';
  buttonText?: string;
  buttonUrl?: string;
  backgroundColor?: string;
}

export interface HomeBlockConfigMap {
  Banner: HomeBannerBlockConfig;
  ImageGrid: HomeImageGridBlockConfig;
  FeaturedProducts: HomeFeaturedProductsBlockConfig;
  ImageText: HomeImageTextBlockConfig;
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
