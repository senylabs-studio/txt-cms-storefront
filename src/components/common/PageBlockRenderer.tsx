import React, { type JSX } from 'react';
import { Row, Col, Carousel } from 'react-bootstrap';
import type {
  StorefrontPageBlock,
  StorefrontPageBlockType,
  StorefrontPageDetail,
  BlockStyle,
  PageBlockConfig,
  HeaderBlockConfig,
  ParagraphBlockConfig,
  HeaderParagraphBlockConfig,
  ListBlockConfig,
  ImageBlockConfig,
  ImageTextBlockConfig,
  DividerBlockConfig,
  GalleryBlockConfig,
  FormFieldBlockConfig,
  BannerBlockConfig,
  SubPagesBlockConfig,
  ProductsBlockConfig,
  FeaturedProductsBlockConfig,
} from '../../types';
import { pageUrl } from '../../utils/pageUrl';
import VariantCard from '../Product/VariantCard/VariantCard';
import './PageBlockRenderer.css';

// ─── Style helpers ────────────────────────────────────────────────────────────
const FONT_SIZE: Record<string, string> = {
  sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem',
};
const FONT_WEIGHT: Record<string, string> = {
  normal: '400', semibold: '600', bold: '700',
};
const LETTER_SPACING: Record<string, string> = {
  normal: 'normal', wide: '0.05em', wider: '0.1em',
};
const PADDING: Record<string, string> = {
  none: '0', sm: '0.5rem 0', md: '1.25rem 0', lg: '2.5rem 0',
};

function buildStyle(style?: BlockStyle): React.CSSProperties {
  if (!style) return {};
  return {
    textAlign: style.textAlign ?? undefined,
    color: style.color || undefined,
    backgroundColor: style.backgroundColor || undefined,
    fontSize: style.fontSize ? FONT_SIZE[style.fontSize] : undefined,
    fontWeight: style.fontWeight ? FONT_WEIGHT[style.fontWeight] : undefined,
    fontStyle: style.fontStyle === 'italic' ? 'italic' : undefined,
    textDecoration: style.textDecoration === 'underline' ? 'underline' : undefined,
    letterSpacing: style.letterSpacing ? LETTER_SPACING[style.letterSpacing] : undefined,
    padding: style.padding ? PADDING[style.padding] : undefined,
  };
}

// ─── Block renderers ──────────────────────────────────────────────────────────
const HeaderBlock: React.FC<{ config: HeaderBlockConfig }> = ({ config }) => {
  const Tag = (config.level ?? 'h2') as keyof JSX.IntrinsicElements;
  return <Tag style={buildStyle(config.style)}>{config.text}</Tag>;
};

const ParagraphBlock: React.FC<{ config: ParagraphBlockConfig }> = ({ config }) => (
  <div
    className="rich-text"
    style={buildStyle(config.style)}
    dangerouslySetInnerHTML={{ __html: config.text ?? '' }}
  />
);

const HeaderParagraphBlock: React.FC<{ config: HeaderParagraphBlockConfig }> = ({ config }) => {
  const lvl = config.level;
  let Tag: keyof JSX.IntrinsicElements = 'h2';
  if (typeof lvl === 'number') {
    const numericTags = ['h2', 'h3', 'h4', 'h5', 'h6'];
    Tag = (numericTags[lvl - 1] ?? 'h2') as keyof JSX.IntrinsicElements;
  } else {
    const s = String(lvl ?? 'h2').toLowerCase();
    if (/^h[1-6]$/.test(s)) Tag = s as keyof JSX.IntrinsicElements;
  }
  const headerText = config.headerText ?? config.header ?? '';
  const paragraphText = config.paragraphText ?? config.text ?? '';
  return (
    <div style={buildStyle(config.style)}>
      <Tag>{headerText}</Tag>
      {paragraphText && <div className="rich-text pbr-header-paragraph-text" dangerouslySetInnerHTML={{ __html: paragraphText }} />}
    </div>
  );
};

const ListBlock: React.FC<{ config: ListBlockConfig }> = ({ config }) => {
  const rawItems = typeof config.items === 'string'
    ? config.items
    : Array.isArray(config.items)
      ? config.items.join('\n')
      : '';
  const items = rawItems.split('\n').map((item: string) => item.trim()).filter(Boolean);
  if (items.length === 0) return null;
  const Tag = config.variant === 'ordered' ? 'ol' : 'ul';
  return (
    <Tag className="pbr-list" style={buildStyle(config.style)}>
      {items.map((item: string, index: number) => (
        <li key={index}>{item}</li>
      ))}
    </Tag>
  );
};

const ImageBlock: React.FC<{ config: ImageBlockConfig }> = ({ config }) => {
  if (!config.imageUrl) return null;
  const img = <img src={config.imageUrl} alt={config.altText ?? ''} />;
  return (
    <figure className="pbr-image" style={buildStyle(config.style)}>
      {config.linkUrl ? <a href={config.linkUrl} target="_blank" rel="noopener noreferrer">{img}</a> : img}
      {config.caption && <figcaption className="pbr-image-caption">{config.caption}</figcaption>}
    </figure>
  );
};

const ImageTextBlock: React.FC<{ config: ImageTextBlockConfig }> = ({ config }) => {
  const imageLeft = (config.imagePosition ?? 'left') === 'left';
  const imgCol = config.imageUrl ? (
    <Col md={5}>
      <img src={config.imageUrl} alt={config.title ?? ''} className="pbr-image-text-img" />
    </Col>
  ) : null;
  const textCol = (
    <Col md={config.imageUrl ? 7 : 12} style={buildStyle(config.style)}>
      {config.title && <h3>{config.title}</h3>}
      {config.text && <div className="rich-text" dangerouslySetInnerHTML={{ __html: config.text }} />}
      {config.buttonText && config.buttonUrl && (
        <a href={config.buttonUrl} className="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer">
          {config.buttonText}
        </a>
      )}
    </Col>
  );
  return (
    <Row className="align-items-center g-4">
      {imageLeft ? <>{imgCol}{textCol}</> : <>{textCol}{imgCol}</>}
    </Row>
  );
};

const DividerBlock: React.FC<{ config: DividerBlockConfig }> = ({ config }) => (
  <hr style={{ borderColor: config.style?.color || '#dee2e6', ...buildStyle(config.style), padding: undefined, margin: config.style?.padding ? PADDING[config.style.padding] : '0.75rem 0' }} />
);

const GalleryBlock: React.FC<{ config: GalleryBlockConfig }> = ({ config }) => {
  const images = config.images ?? [];
  const cols = config.columns ?? 3;
  if (images.length === 0) return null;
  return (
    <div style={buildStyle(config.style)}>
      <Row xs={2} sm={cols} className="g-3">
        {images.map((img, i) => (
          <Col key={i}>
            {img.linkUrl
              ? <a href={img.linkUrl} target="_blank" rel="noopener noreferrer">
                  <img src={img.imageUrl} alt={img.altText ?? ''} className="pbr-gallery-img" />
                </a>
              : <img src={img.imageUrl} alt={img.altText ?? ''} className="pbr-gallery-img" />
            }
          </Col>
        ))}
      </Row>
    </div>
  );
};

const FormFieldBlock: React.FC<{ config: FormFieldBlockConfig }> = ({ config }) => (
  <div style={buildStyle(config.style)}>
    <label className="pbr-form-label">
      {config.label}
      {config.required && <span className="pbr-form-required">*</span>}
    </label>
    {config.fieldType === 'textarea' ? (
      <textarea
        className="form-control"
        placeholder={config.placeholder}
        required={config.required}
        rows={4}
      />
    ) : config.fieldType === 'select' ? (
      <select className="form-select" required={config.required}>
        <option value="">{config.placeholder || 'Selecciona una opción'}</option>
        {(config.options ?? '').split('\n').filter(Boolean).map((opt: string, i: number) => (
          <option key={i} value={opt.trim()}>{opt.trim()}</option>
        ))}
      </select>
    ) : config.fieldType === 'checkbox' ? (
      <div className="form-check">
        <input className="form-check-input" type="checkbox" required={config.required} id={`field-${config.label}`} />
        <label className="form-check-label" htmlFor={`field-${config.label}`}>{config.placeholder}</label>
      </div>
    ) : (
      <input
        className="form-control"
        type={config.fieldType ?? 'text'}
        placeholder={config.placeholder}
        required={config.required}
      />
    )}
  </div>
);

const BannerBlock: React.FC<{ config: BannerBlockConfig }> = ({ config }) => {
  const slides = config.slides ?? [];
  if (slides.length === 0) return null;

  const height = config.height ?? 500;
  return (
    <Carousel style={buildStyle(config.style)}>
      {slides.map((slide, i) => (
        <Carousel.Item key={i}>
          <div
            className="pbr-banner"
            style={{
              backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined,
              backgroundColor: slide.imageUrl ? undefined : '#343a40',
              height,
              minHeight: height,
            }}
          >
            {slide.imageUrl && <div className="pbr-banner-overlay" />}
            <div className="pbr-banner-content">
              {slide.title && <h2 className="pbr-banner-title">{slide.title}</h2>}
              {slide.subtitle && <p className="pbr-banner-subtitle">{slide.subtitle}</p>}
              {slide.buttonText && slide.buttonUrl && (
                <a href={slide.buttonUrl} className="btn btn-light btn-lg">{slide.buttonText}</a>
              )}
            </div>
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  );
};

const SubPagesBlock: React.FC<{ config: SubPagesBlockConfig; pageDetail?: StorefrontPageDetail }> = ({ config, pageDetail }) => {
  const children = pageDetail?.childPages ?? [];
  const cols = config.columns ?? 3;
  if (children.length === 0) return null;
  return (
    <div style={buildStyle(config.style)}>
      <Row xs={1} sm={2} md={cols} className="g-4">
        {children.map(child => (
          <Col key={child.id}>
            <a href={pageUrl(child.type, child.slug)} className="pbr-subpages-link">
              <div className="pbr-subpages-card">
                {child.imageUrl && (
                  <img src={child.imageUrl} alt={child.name} className="pbr-subpages-img" />
                )}
                <div className="pbr-subpages-body">
                  <div className="pbr-subpages-name">{child.name}</div>
                  {child.description && <p className="pbr-subpages-desc">{child.description}</p>}
                </div>
              </div>
            </a>
          </Col>
        ))}
      </Row>
    </div>
  );
};

const ProductsBlock: React.FC<{ config: ProductsBlockConfig; pageDetail?: StorefrontPageDetail }> = ({ config, pageDetail }) => {
  const items = pageDetail?.items ?? [];
  const cols = config.columns ?? 4;
  if (items.length === 0) return null;
  return (
    <div style={buildStyle(config.style)}>
      <Row xs={2} sm={cols > 2 ? 3 : 2} md={cols} className="g-3">
        {items.map(item => (
          <Col key={item.variantId}>
            <VariantCard variant={{
              id: item.variantId,
              name: item.name,
              code: item.code,
              price: item.price,
              originalPrice: item.originalPrice,
              discountPercent: 0,
              availableStock: item.availableStock,
              thumbnailUrl: item.thumbnailUrl,
              typeValue: item.typeValue,
              productId: item.productId,
              productName: item.name,
              productSlug: item.productSlug,
              width: item.width,
              composition: item.composition,
            }} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

const FeaturedProductsBlock: React.FC<{ config: FeaturedProductsBlockConfig }> = ({ config }) => {
  // productIds are stored in config; the storefront would need to fetch them.
  // This renders a placeholder if no data is injected externally.
  const title = config.title;
  const ids = config.productIds ?? [];
  if (ids.length === 0 && !title) return null;
  return (
    <div style={buildStyle(config.style)}>
      {title && <h3 className="pbr-featured-title">{title}</h3>}
      {ids.length === 0 && <p className="text-muted">No hay productos destacados configurados.</p>}
    </div>
  );
};

// ─── Registry ─────────────────────────────────────────────────────────────────
// Each *Block component above is precisely typed against its own config shape —
// only this lookup-by-runtime-type registry needs a shared shape (same reasoning
// as CONFIG_EDITORS in the CMS's BlockEditors.tsx).
const RENDERERS = {
  Header: ({ config }: { config: HeaderBlockConfig }) => <HeaderBlock config={config} />,
  Paragraph: ({ config }: { config: ParagraphBlockConfig }) => <ParagraphBlock config={config} />,
  HeaderParagraph: ({ config }: { config: HeaderParagraphBlockConfig }) => <HeaderParagraphBlock config={config} />,
  List: ({ config }: { config: ListBlockConfig }) => <ListBlock config={config} />,
  Image: ({ config }: { config: ImageBlockConfig }) => <ImageBlock config={config} />,
  ImageText: ({ config }: { config: ImageTextBlockConfig }) => <ImageTextBlock config={config} />,
  Divider: ({ config }: { config: DividerBlockConfig }) => <DividerBlock config={config} />,
  Gallery: ({ config }: { config: GalleryBlockConfig }) => <GalleryBlock config={config} />,
  FormField: ({ config }: { config: FormFieldBlockConfig }) => <FormFieldBlock config={config} />,
  Banner: ({ config }: { config: BannerBlockConfig }) => <BannerBlock config={config} />,
  SubPages: ({ config, pageDetail }: { config: SubPagesBlockConfig; pageDetail?: StorefrontPageDetail }) => <SubPagesBlock config={config} pageDetail={pageDetail} />,
  Products: ({ config, pageDetail }: { config: ProductsBlockConfig; pageDetail?: StorefrontPageDetail }) => <ProductsBlock config={config} pageDetail={pageDetail} />,
  FeaturedProducts: ({ config }: { config: FeaturedProductsBlockConfig }) => <FeaturedProductsBlock config={config} />,
} as unknown as Record<StorefrontPageBlockType, React.FC<{ config: PageBlockConfig; pageDetail?: StorefrontPageDetail }>>;

// ─── Main export ──────────────────────────────────────────────────────────────
interface PageBlockRendererProps {
  blocks: StorefrontPageBlock[];
  pageDetail?: StorefrontPageDetail;
}

const PageBlockRenderer: React.FC<PageBlockRendererProps> = ({ blocks, pageDetail }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="page-blocks">
      {blocks.map(block => {
        const Renderer = RENDERERS[block.type];
        if (!Renderer) return null;
        const bgColor = block.config.style?.backgroundColor;
        return (
          <div
            key={block.id}
            style={bgColor ? { backgroundColor: bgColor } : undefined}
          >
            <Renderer config={block.config} pageDetail={pageDetail} />
          </div>
        );
      })}
    </div>
  );
};

export default PageBlockRenderer;
