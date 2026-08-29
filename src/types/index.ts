export interface StorefrontProduct {
  id: number;
  code: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  availableStock: number;
  thumbnailUrl?: string;
  imageUrls?: string[];
  productTypeName?: string;
  hasVariants: boolean;
  variants?: StorefrontVariant[];
  width?: number;
  composition?: string;
  minQuantity: number;
  quantityStep: number;
}

export interface StorefrontVariant {
  id: number;
  name: string;
  code: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  availableStock: number;
  thumbnailUrl?: string;
  imageUrls?: string[];
  typeValue?: string;
  productId: number;
  productName: string;
  productSlug: string;
  productTypeName?: string;
  width?: number;
  composition?: string;
  minQuantity: number;
  quantityStep: number;
}

export interface StorefrontImage {
  url: string;
  isRealScale: boolean;
  realWidthCm?: number;
}

export interface StorefrontVariantDetail {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  availableStock: number;
  typeValue: string;
  thumbnailUrl?: string;
  images: StorefrontImage[];
  productId: number;
  productName: string;
  productSlug: string;
  width: number;
  weight: number;
  composition: string;
  fall?: string;
  texture?: string;
  fabricType?: string;
  careLabels?: number;
  productTypeName: string;
  minQuantity: number;
  quantityStep: number;
  siblings: StorefrontVariant[];
  alsoBought: StorefrontVariant[];
  /** True when alsoBought came from the same-category fallback rather than real co-purchase
   *  data — use this to show "you might also like" instead of "customers also bought". */
  alsoBoughtIsFallback: boolean;
  averageRating?: number;
  reviewCount: number;
}

export interface ProductReview {
  id: number;
  customerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface MyReviewStatus {
  hasPurchased: boolean;
  review: ProductReview | null;
}

export interface CartItem {
  id: number;
  productId?: number;
  variantId?: number;
  productName: string;
  productCode: string;
  originalUnitPrice: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  thumbnailUrl?: string;
  availableStock: number;
}

export interface Cart {
  id: number;
  expiresAt: string;
  items: CartItem[];
  discountPercent: number;
  couponCode?: string;
  couponDiscountAmount: number;
  couponError?: string;
  total: number;
}

export interface CheckoutRequest {
  shippingAddressId?: number;
  billingAddressId?: number;
  notes?: string;
  browserAcceptHeader?: string;
  browserUserAgent?: string;
  browserJavaEnabled?: boolean;
  browserLanguage?: string;
  browserColorDepth?: string;
  browserScreenHeight?: string;
  browserScreenWidth?: string;
  browserTZ?: string;
}

export interface CheckoutResponse {
  merchantParameters: string;
  signature: string;
  signatureVersion: string;
  redsysUrl: string;
  amount: number;
  shippingCost: number;
  couponDiscountAmount: number;
}

export interface CustomerAddress {
  id: number;
  alias: string;
  recipientName: string;
  street: string;
  city: string;
  postalCode: string;
  province?: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface StorefrontProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  taxId?: string;
  isGuest: boolean;
  customerGroupName?: string;
  addresses: CustomerAddress[];
  paymentMethods: PaymentMethod[];
}

export interface PaymentMethod {
  id: number;
  type: string;
  alias: string;
  lastFourDigits?: string;
  isDefault: boolean;
}

export interface StorefrontOrder {
  id: number;
  status: string;
  total: number;
  createdAt: string;
}

export interface StorefrontOrderDetail {
  id: number;
  status: string;
  total: number;
  shippingCost: number;
  createdAt: string;
  notes?: string;
  trackingNumber?: string;
  returnRequestedAt?: string;
  returnRequestReason?: string;
  shippingAddress?: AddressSummary;
  billingAddress?: AddressSummary;
  lines: OrderLine[];
}

export interface AddressSummary {
  recipientName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderLine {
  productName: string;
  productCode: string;
  unitPrice: number;
  discountPercent: number;
  quantity: number;
  subtotal: number;
  thumbnailUrl?: string;
  /** Null for synthetic lines (shipping/discount adjustments) or a non-variant product purchase —
   *  reviews are only reachable from a variant's own detail page. */
  variantId?: number;
}

export interface StorefrontMenuItem {
  id: number;
  name: string;
  slug: string;
  type: string;
  externalUrl?: string;
  imageUrl?: string;
  order: number;
  children: StorefrontMenuItem[];
}

export interface StorefrontPageItem {
  variantId: number;
  productId: number;
  name: string;
  code: string;
  variantSlug: string;
  productSlug: string;
  price: number;
  originalPrice: number;
  availableStock: number;
  thumbnailUrl?: string;
  typeValue?: string;
  order: number;
  width?: number;
  composition?: string;
  minQuantity: number;
  quantityStep: number;
}

export interface PageFilterFacets {
  minPrice: number;
  maxPrice: number;
  widths: number[];
  materials: string[];
}

export interface BlockStyle {
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  fontWeight?: 'normal' | 'semibold' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  letterSpacing?: 'normal' | 'wide' | 'wider';
}

export type StorefrontPageBlockType =
  | 'Header'
  | 'Paragraph'
  | 'HeaderParagraph'
  | 'List'
  | 'Image'
  | 'ImageText'
  | 'Divider'
  | 'Gallery'
  | 'FormField'
  | 'Banner'
  | 'SubPages'
  | 'Products'
  | 'FeaturedProducts';

export interface HeaderBlockConfig {
  text: string;
  level: 'h1' | 'h2' | 'h3' | 'h4';
  style?: BlockStyle;
}

export interface ParagraphBlockConfig {
  text: string;
  style?: BlockStyle;
}

/** `header`/`text` are legacy field names kept around for old saved blocks. */
export interface HeaderParagraphBlockConfig {
  headerText?: string;
  header?: string;
  paragraphText?: string;
  text?: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4';
  style?: BlockStyle;
}

export interface ListBlockConfig {
  items: string | string[];
  variant?: 'unordered' | 'ordered';
  style?: BlockStyle;
}

export interface ImageBlockConfig {
  imageUrl: string;
  altText?: string;
  linkUrl?: string;
  caption?: string;
  style?: BlockStyle;
}

export interface ImageTextBlockConfig {
  imageUrl?: string;
  title?: string;
  text?: string;
  imagePosition?: 'left' | 'right';
  buttonText?: string;
  buttonUrl?: string;
  style?: BlockStyle;
}

export interface DividerBlockConfig {
  style?: BlockStyle;
}

export interface GalleryImage {
  imageUrl: string;
  altText?: string;
  linkUrl?: string;
}

export interface GalleryBlockConfig {
  images: GalleryImage[];
  columns?: number;
  style?: BlockStyle;
}

export interface FormFieldBlockConfig {
  fieldType?: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string;
  style?: BlockStyle;
}

export interface SubPagesBlockConfig {
  columns?: number;
  style?: BlockStyle;
}

export interface ProductsBlockConfig {
  columns?: number;
  style?: BlockStyle;
}

export interface BannerSlide {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface BannerBlockConfig {
  slides: BannerSlide[];
  height?: number;
  intervalSeconds?: number;
  style?: BlockStyle;
}

export interface FeaturedProductsBlockConfig {
  title?: string;
  productIds?: number[];
  style?: BlockStyle;
  /** Resolved server-side from productIds/variantIds — see FeaturedProductItem. */
  variants?: FeaturedProductGridItem[];
  products?: FeaturedProductGridItem[];
}

/** Shape the backend resolves productIds/variantIds into (mirrors HomeFeaturedItem). */
export interface FeaturedProductGridItem {
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

export interface PageBlockConfigMap {
  Header: HeaderBlockConfig;
  Paragraph: ParagraphBlockConfig;
  HeaderParagraph: HeaderParagraphBlockConfig;
  List: ListBlockConfig;
  Image: ImageBlockConfig;
  ImageText: ImageTextBlockConfig;
  Divider: DividerBlockConfig;
  Gallery: GalleryBlockConfig;
  FormField: FormFieldBlockConfig;
  Banner: BannerBlockConfig;
  SubPages: SubPagesBlockConfig;
  Products: ProductsBlockConfig;
  FeaturedProducts: FeaturedProductsBlockConfig;
}

/** Union of every possible page-block config shape. */
export type PageBlockConfig = PageBlockConfigMap[StorefrontPageBlockType];

/** Distributed so `block.type` correctly narrows `block.config`'s shape. */
export type StorefrontPageBlock = {
  [K in StorefrontPageBlockType]: {
    id: number;
    type: K;
    config: PageBlockConfigMap[K];
    sortOrder: number;
  };
}[StorefrontPageBlockType];

export interface StorefrontChildPage {
  id: number;
  name: string;
  slug: string;
  description: string;
  type: string;
  imageUrl?: string;
}

export interface StorefrontPageDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  type: string;
  externalUrl?: string;
  imageUrl?: string;
  items: StorefrontPageItem[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  blocks: StorefrontPageBlock[];
  childPages: StorefrontChildPage[];
  facets?: PageFilterFacets;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface AuthResponse {
  token: string;
  customerId: number;
  name: string;
  email: string;
  isGuest?: boolean;
}
