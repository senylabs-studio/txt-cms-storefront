import React, { type JSX } from 'react';
import { Row, Col, Carousel } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import type { IconType } from 'react-icons';
import {
  FaInfoCircle, FaTruck, FaQuestionCircle, FaPhoneAlt, FaEnvelope, FaClock,
  FaMapMarkerAlt, FaExclamationTriangle, FaCheck, FaChevronDown, FaCut,
} from 'react-icons/fa';
import type {
  StorefrontPageBlock,
  StorefrontPageBlockType,
  StorefrontPageDetail,
  BlockStyle,
  CalloutIcon,
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
  InfoCardsBlockConfig,
  TimelineBlockConfig,
  OpeningHoursBlockConfig,
} from '../../types';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { dayName, getOpeningStatus, groupOpeningHours, madridNow, rowLabel, type OpeningStatus } from '../../utils/openingHours';
import { pageUrl } from '../../utils/pageUrl';
import VariantCard from '../Product/VariantCard/VariantCard';
import FeaturedProductsGrid from './FeaturedProductsGrid/FeaturedProductsGrid';
import { bannerTextPlacement } from '../../utils/bannerTextPlacement';
import { blockLinkProps } from '../../utils/blockLinkProps';
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

// Defense-in-depth only — the backend (PageBlockContentSanitizer) is the actual trust boundary
// and already strips this before it's ever stored, since a direct API call bypasses the CMS's
// TipTap editor UI entirely. This just means a bug or a future backend regression can't turn
// into a live XSS against every storefront visitor on its own; the allow-list mirrors exactly
// what RichTextEditor.tsx's TipTap extensions can produce.
function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 's', 'strike', 'u', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

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

/** buildStyle minus the padding preset, for boxed variants (callout, accordion, cards, hours):
 *  they have their own inner padding, and a preset — the CMS default "none" is an inline
 *  `padding: 0`, "md" is `1.25rem 0` — would flatten the content against the box's border. */
function boxStyle(style?: BlockStyle): React.CSSProperties {
  return { ...buildStyle(style), padding: undefined };
}

// ─── Block renderers ──────────────────────────────────────────────────────────
const HeaderBlock: React.FC<{ config: HeaderBlockConfig }> = ({ config }) => {
  const Tag = (config.level ?? 'h2') as keyof JSX.IntrinsicElements;
  return <Tag style={buildStyle(config.style)}>{config.text}</Tag>;
};

const ParagraphBlock: React.FC<{ config: ParagraphBlockConfig }> = ({ config }) => (
  <div
    className={config.variant === 'lead' ? 'rich-text pbr-lead' : 'rich-text'}
    style={buildStyle(config.style)}
    dangerouslySetInnerHTML={{ __html: sanitizeRichText(config.text ?? '') }}
  />
);

const CALLOUT_ICONS: Record<CalloutIcon, IconType> = {
  info: FaInfoCircle,
  truck: FaTruck,
  help: FaQuestionCircle,
  phone: FaPhoneAlt,
  mail: FaEnvelope,
  clock: FaClock,
  pin: FaMapMarkerAlt,
  alert: FaExclamationTriangle,
};

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

  if (config.variant === 'accordion') {
    return (
      <details className="pbr-accordion" style={boxStyle(config.style)}>
        <summary>
          <Tag className="pbr-accordion-title">{headerText}</Tag>
          <FaChevronDown className="pbr-accordion-chevron" aria-hidden="true" />
        </summary>
        {paragraphText && <div className="rich-text pbr-accordion-body" dangerouslySetInnerHTML={{ __html: sanitizeRichText(paragraphText) }} />}
      </details>
    );
  }

  if (config.variant === 'callout') {
    const Icon = CALLOUT_ICONS[config.icon ?? 'info'] ?? FaInfoCircle;
    return (
      <div className="pbr-callout" style={boxStyle(config.style)}>
        <span className="pbr-callout-icon" aria-hidden="true"><Icon /></span>
        <div className="pbr-callout-body">
          {headerText && <Tag className="pbr-callout-title">{headerText}</Tag>}
          {paragraphText && <div className="rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(paragraphText) }} />}
          {config.buttonText && config.buttonUrl && (
            <a {...blockLinkProps(config.buttonUrl)} className="btn btn-primary btn-sm pbr-callout-btn">
              {config.buttonText}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={buildStyle(config.style)}>
      <Tag>{headerText}</Tag>
      {paragraphText && <div className="rich-text pbr-header-paragraph-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(paragraphText) }} />}
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
  if (config.variant === 'check') {
    return (
      <ul className="pbr-list-check" style={buildStyle(config.style)}>
        {items.map((item: string, index: number) => (
          <li key={index}><FaCheck className="pbr-list-check-icon" aria-hidden="true" /><span>{item}</span></li>
        ))}
      </ul>
    );
  }
  if (config.variant === 'steps' || config.variant === 'chips') {
    const Wrapper = config.variant === 'steps' ? 'ol' : 'ul';
    return (
      <Wrapper className={`pbr-list-${config.variant}`} style={buildStyle(config.style)}>
        {items.map((item: string, index: number) => (
          <li key={index}>{item}</li>
        ))}
      </Wrapper>
    );
  }
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
      {config.linkUrl ? <a {...blockLinkProps(config.linkUrl)}>{img}</a> : img}
      {config.caption && <figcaption className="pbr-image-caption">{config.caption}</figcaption>}
    </figure>
  );
};

const ImageTextBlock: React.FC<{ config: ImageTextBlockConfig }> = ({ config }) => {
  const imageLeft = (config.imagePosition ?? 'left') === 'left';
  const card = config.variant === 'card';
  const imgCol = config.imageUrl ? (
    <Col md={5} className={card ? 'pbr-image-text-card-media' : undefined}>
      <img src={config.imageUrl} alt={config.title ?? ''} className="pbr-image-text-img" />
    </Col>
  ) : null;
  const textCol = (
    <Col md={config.imageUrl ? 7 : 12} className={card ? 'pbr-image-text-card-body' : undefined} style={card ? boxStyle(config.style) : buildStyle(config.style)}>
      {config.title && <h3>{config.title}</h3>}
      {config.text && <div className="rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(config.text) }} />}
      {config.buttonText && config.buttonUrl && (
        <a {...blockLinkProps(config.buttonUrl)} className="btn btn-primary btn-sm">
          {config.buttonText}
        </a>
      )}
    </Col>
  );
  return (
    <Row className={card ? 'pbr-image-text-card g-0' : 'align-items-center g-4'}>
      {imageLeft ? <>{imgCol}{textCol}</> : <>{textCol}{imgCol}</>}
    </Row>
  );
};

const DIVIDER_SPACE: Record<string, string> = {
  none: '1rem', sm: '1.5rem', md: '2.5rem', lg: '4rem',
};

const DividerBlock: React.FC<{ config: DividerBlockConfig }> = ({ config }) => {
  const margin = config.style?.padding ? PADDING[config.style.padding] : '0.75rem 0';
  if (config.variant === 'space') {
    return <div className="pbr-divider-space" aria-hidden="true" style={{ height: DIVIDER_SPACE[config.style?.padding ?? 'none'] }} />;
  }
  if (config.variant === 'stitch') {
    return (
      <div role="separator" className="pbr-divider-stitch" style={{ color: config.style?.color || undefined, margin }}>
        <FaCut aria-hidden="true" />
      </div>
    );
  }
  return <hr style={{ borderColor: config.style?.color || '#dee2e6', ...buildStyle(config.style), padding: undefined, margin }} />;
};

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
              ? <a {...blockLinkProps(img.linkUrl)}>
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

const FormFieldBlock: React.FC<{ config: FormFieldBlockConfig }> = ({ config }) => {
  // Unique per field: ids built from the label collided whenever two checkboxes had an empty
  // label, so clicking the second one's text ticked the first.
  const id = React.useId();
  return (
    <div style={buildStyle(config.style)}>
      {/* A checkbox carries its own text (and required mark) on its line; the label above is only a
          heading, shown when there is one — with an empty label the "*" used to sit alone there. */}
      {(config.fieldType !== 'checkbox' || config.label) && (
        <label className="pbr-form-label">
          {config.label}
          {config.required && config.fieldType !== 'checkbox' && <span className="pbr-form-required">*</span>}
        </label>
      )}
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
          <input className="form-check-input" type="checkbox" required={config.required} id={id} />
          <label className="form-check-label" htmlFor={id}>
            {config.placeholder || config.label}
            {config.required && <span className="pbr-form-required">*</span>}
          </label>
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
};

const BannerBlock: React.FC<{ config: BannerBlockConfig }> = ({ config }) => {
  const slides = config.slides ?? [];
  if (slides.length === 0) return null;

  const height = config.height ?? 500;
  return (
    <Carousel interval={(config.intervalSeconds ?? 5) * 1000} style={buildStyle(config.style)}>
      {slides.map((slide, i) => (
        <Carousel.Item key={i}>
          <div
            className="pbr-banner"
            style={{
              backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined,
              backgroundColor: slide.imageUrl ? undefined : '#343a40',
              height,
              minHeight: height,
              ...bannerTextPlacement(slide.textAlign, slide.textVerticalAlign),
            }}
          >
            {slide.imageUrl && <div className="pbr-banner-overlay" />}
            <div className="pbr-banner-content" style={{ textAlign: slide.textAlign ?? 'center' }}>
              {slide.title && <h2 className="pbr-banner-title">{slide.title}</h2>}
              {slide.subtitle && <p className="pbr-banner-subtitle">{slide.subtitle}</p>}
              {slide.buttonText && slide.buttonUrl && (
                <a {...blockLinkProps(slide.buttonUrl)} className="btn btn-light btn-lg">{slide.buttonText}</a>
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
    <div className="pbr-products" style={buildStyle(config.style)}>
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
              minQuantity: item.minQuantity,
              quantityStep: item.quantityStep,
              isNew: item.isNew,
            }} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

const FeaturedProductsBlock: React.FC<{ config: FeaturedProductsBlockConfig }> = ({ config }) => {
  const { t } = useTranslation();
  return (
    <div style={buildStyle(config.style)}>
      <FeaturedProductsGrid
        title={config.title}
        variants={config.variants}
        products={config.products}
        emptyMessage={t('product.noFeaturedProducts')}
      />
    </div>
  );
};

const InfoCardsBlock: React.FC<{ config: InfoCardsBlockConfig }> = ({ config }) => {
  const cards = (config.items ?? []).filter(c => c.label || c.value || c.note);
  if (cards.length === 0) return null;
  const rows = config.variant === 'rows';
  return (
    <div className={rows ? 'pbr-cards-rows' : 'pbr-cards'} style={buildStyle(config.style)}>
      {cards.map((card, i) => {
        const Icon = card.icon ? CALLOUT_ICONS[card.icon] : undefined;
        const link = card.linkText && card.linkUrl
          ? <a {...blockLinkProps(card.linkUrl)} className="pbr-card-link">{card.linkText}</a>
          : null;
        if (rows) {
          return (
            <div key={card.id ?? i} className="pbr-card-row">
              {Icon && <span className="pbr-card-row-icon" aria-hidden="true"><Icon /></span>}
              <div className="pbr-card-row-text">
                {card.label && <div className="pbr-card-label">{card.label}</div>}
                {card.value && <div className="pbr-card-row-value">{card.value}</div>}
                {(card.unit || card.note) && <div className="pbr-card-note">{[card.unit, card.note].filter(Boolean).join(' · ')}</div>}
              </div>
              {link}
            </div>
          );
        }
        return (
          <div key={card.id ?? i} className="pbr-card">
            {(Icon || card.label) && (
              <div className="pbr-card-label">{Icon && <Icon aria-hidden="true" />}{card.label}</div>
            )}
            {card.value && <div className="pbr-card-value">{card.value}</div>}
            {card.unit && <div className="pbr-card-unit">{card.unit}</div>}
            {card.warning && (
              <span className="pbr-card-warning"><FaExclamationTriangle aria-hidden="true" />{card.warning}</span>
            )}
            {card.note && <div className="pbr-card-note pbr-card-note-bottom">{card.note}</div>}
            {link}
          </div>
        );
      })}
    </div>
  );
};

const TimelineBlock: React.FC<{ config: TimelineBlockConfig }> = ({ config }) => {
  const items = (config.items ?? []).filter(item => item.year || item.title || item.description);
  if (items.length === 0) return null;
  return (
    <ol className="pbr-timeline" style={buildStyle(config.style)}>
      {items.map((item, i) => (
        <li key={item.id ?? i}>
          {item.year && <div className="pbr-timeline-year">{item.year}</div>}
          {item.title && <div className="pbr-timeline-title">{item.title}</div>}
          {item.description && <p className="pbr-timeline-desc">{item.description}</p>}
        </li>
      ))}
    </ol>
  );
};

const OpeningHoursBlock: React.FC<{ config: OpeningHoursBlockConfig }> = ({ config }) => {
  const { t, i18n } = useTranslation();
  const { openingHours } = useSiteSettings();
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const hours = openingHours ?? [];
  if (hours.length === 0) return null;

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'es';
  const today = madridNow(now).day;
  const status = config.showStatus === false ? null : getOpeningStatus(hours, now);
  const statusText = (s: OpeningStatus): string => {
    if (s.open) return t('openingHours.openNow', { time: s.closesAt });
    if (s.opensAt === null) return t('openingHours.closed');
    if (s.inDays === 0) return t('openingHours.opensToday', { time: s.opensAt });
    if (s.inDays === 1) return t('openingHours.opensTomorrow', { time: s.opensAt });
    return t('openingHours.opensOn', { day: dayName(s.day, locale), time: s.opensAt });
  };

  return (
    <div className="pbr-hours" style={boxStyle(config.style)}>
      <div className="pbr-hours-top">
        <h3 className="pbr-hours-title"><FaClock aria-hidden="true" />{config.title || t('openingHours.title')}</h3>
        {status && <span className={`pbr-hours-status${status.open ? ' is-open' : ''}`}>{statusText(status)}</span>}
      </div>
      <table className="pbr-hours-table">
        <tbody>
          {groupOpeningHours(hours).map(row => (
            <tr key={row.days.join('-')} className={row.days.includes(today) ? 'is-today' : undefined}>
              <th scope="row">{rowLabel(row, locale)}</th>
              <td>
                {row.ranges.length > 0
                  ? row.ranges.map(r => <span key={r.open} className="pbr-hours-range">{r.open} – {r.close}</span>)
                  : <span className="pbr-hours-closed">{t('openingHours.closed')}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {config.note && <p className="pbr-hours-note">{config.note}</p>}
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
  InfoCards: ({ config }: { config: InfoCardsBlockConfig }) => <InfoCardsBlock config={config} />,
  Timeline: ({ config }: { config: TimelineBlockConfig }) => <TimelineBlock config={config} />,
  OpeningHours: ({ config }: { config: OpeningHoursBlockConfig }) => <OpeningHoursBlock config={config} />,
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
