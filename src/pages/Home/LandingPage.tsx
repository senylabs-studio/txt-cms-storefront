import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Carousel } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  FaCut, FaTruck, FaUndoAlt, FaLock, FaStore, FaGift, FaPhoneAlt, FaRulerHorizontal, FaLeaf, FaStar, FaCreditCard, FaClock,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import {
  getHomeBlocks,
  type StorefrontHomeBlock,
  type HomeBannerBlockConfig,
  type HomeBannerSlide,
  type HomeImageGridBlockConfig,
  type HomeFeaturedProductsBlockConfig,
  type HomeImageTextBlockConfig,
  type HomeFeaturesBlockConfig,
  type HomeFeatureIcon,
  type HomeNewsletterBlockConfig,
} from '../../services/homeService';
import FeaturedProductsGrid from '../../components/common/FeaturedProductsGrid/FeaturedProductsGrid';
import { bannerTextPlacement } from '../../utils/bannerTextPlacement';
import { blockLinkProps } from '../../utils/blockLinkProps';
import './LandingPage.css';
import PageLoader from '../../components/common/ScissorsLoader/PageLoader';
import BannerSlideLink from '../../components/common/BannerSlideLink/BannerSlideLink';
import NewsletterSignup from '../../components/common/NewsletterSignup/NewsletterSignup';
import { NEW_ARRIVALS_PARAM } from '../../utils/catalogParams';

// ─── Banner (carousel) ────────────────────────────────────────────────────────
// The subtitle has its own fixed max-width + auto margins (see LandingPage.css) so it reads as a
// narrow, centered paragraph under the title -- that only looks right when the alignment is
// 'center'. For 'left'/'right' the block itself needs to hug that same side instead of staying
// centered, so the margin follows the alignment rather than always being auto/auto.
const subtitleMarginForAlign = (align: HomeBannerSlide['textAlign']): React.CSSProperties => {
  if (align === 'left') return { marginLeft: 0, marginRight: 'auto' };
  if (align === 'right') return { marginLeft: 'auto', marginRight: 0 };
  return { marginLeft: 'auto', marginRight: 'auto' };
};

const BannerSlideContent: React.FC<{ slide: HomeBannerSlide }> = ({ slide }) => {
  const overlayStyle: React.CSSProperties = { textAlign: slide.textAlign ?? 'center' };
  if (slide.textColor) overlayStyle.color = slide.textColor;

  return (
    <div className="home-banner-overlay banner-slide-content" style={overlayStyle}>
      {slide.title && <h1 className="home-banner-title">{slide.title}</h1>}
      {slide.subtitle && <p className="home-banner-subtitle" style={subtitleMarginForAlign(slide.textAlign)}>{slide.subtitle}</p>}
      {/* Admin-authored URL (may be internal or external) — plain <a>, not <Link>, which
          resolves any absolute URL as an app-relative pathname and silently breaks it. Matches
          PageBlockRenderer's BannerBlock (the equivalent Page-block field). */}
      {slide.buttonText && slide.buttonUrl && (
        <a {...blockLinkProps(slide.buttonUrl)} className="btn btn-light btn-lg px-4">{slide.buttonText}</a>
      )}
    </div>
  );
};

const BannerBlock: React.FC<{ config: HomeBannerBlockConfig }> = ({ config }) => {
  const slides = config.slides ?? [];
  // The CMS height is a desktop height: passed as a CSS variable (not an inline min-height) so
  // LandingPage.css can cap it on phones, where 500px would fill the whole screen.
  const heightVar = { '--home-banner-h': `${config.height ?? 500}px` } as React.CSSProperties;

  if (slides.length === 0) return null;

  if (slides.length === 1) {
    const slide = slides[0];
    return (
      <div
        className="home-banner"
        style={{ backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined, ...heightVar, ...bannerTextPlacement(slide.textAlign, slide.textVerticalAlign) }}
      >
        <BannerSlideLink url={slide.buttonUrl} hasButton={!!slide.buttonText} label={slide.title || slide.subtitle} />
        <BannerSlideContent slide={slide} />
      </div>
    );
  }

  return (
    <Carousel fade interval={(config.intervalSeconds ?? 5) * 1000} className="home-carousel" style={heightVar}>
      {slides.map((slide, i) => (
        <Carousel.Item key={i}>
          <div
            className="home-banner"
            style={{ backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined, ...heightVar, ...bannerTextPlacement(slide.textAlign, slide.textVerticalAlign) }}
          >
            <BannerSlideLink url={slide.buttonUrl} hasButton={!!slide.buttonText} label={slide.title || slide.subtitle} />
            <BannerSlideContent slide={slide} />
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  );
};

// ─── Image Grid ───────────────────────────────────────────────────────────────
const ImageGridBlock: React.FC<{ config: HomeImageGridBlockConfig }> = ({ config }) => {
  const images = config.images ?? [];
  if (images.length === 0) return null;
  // Up to 4 tiles share one row; more wrap 4 per row (4+3 for the 7 sections) and the last row is
  // centered, instead of 12/n columns that left a lone tile on its own row (6+1).
  const colSize = Math.max(3, Math.floor(12 / images.length)) as 3 | 4 | 6 | 12;
  const titleStyle: React.CSSProperties = { textAlign: config.textAlign ?? 'center' };
  if (config.textColor) titleStyle.color = config.textColor;
  return (
    <Container className="py-4">
      {config.title && <h2 className="mb-4 fw-bold" style={titleStyle}>{config.title}</h2>}
      <Row className="g-3 justify-content-center">
        {images.map((img, i) => (
          <Col key={i} xs={6} sm={4} md={colSize}>
            {img.linkUrl ? (
              // Admin-authored URL (may be internal or external) — plain <a>, not <Link>. Matches
              // PageBlockRenderer's Gallery/Image blocks (the equivalent Page-block field).
              <a {...blockLinkProps(img.linkUrl)} className="d-block">
                <div className="home-image-grid-item">
                  <img src={img.imageUrl} alt={img.caption ?? ''} className="w-100 h-100 object-fit-cover" />
                  {img.caption && <div className="home-image-grid-caption">{img.caption}</div>}
                </div>
              </a>
            ) : (
              <div className="home-image-grid-item">
                <img src={img.imageUrl} alt={img.caption ?? ''} className="w-100 h-100 object-fit-cover" />
                {img.caption && <div className="home-image-grid-caption">{img.caption}</div>}
              </div>
            )}
          </Col>
        ))}
      </Row>
    </Container>
  );
};

// ─── Featured Products ────────────────────────────────────────────────────────
// In offers mode the backend picks the variants and, while the Ofertas page is visible, sends its
// URL for a "see all offers" link. In new mode it picks the newest products' variants, and the
// link goes to the catalog filtered to new arrivals. Nothing on sale / nothing new → no cards →
// the grid renders nothing at all.
const FeaturedProductsBlock: React.FC<{ config: HomeFeaturedProductsBlockConfig }> = ({ config }) => {
  const { t } = useTranslation();
  return (
    <FeaturedProductsGrid
      title={config.title}
      variants={config.variants}
      products={config.products}
      titleAlign={config.textAlign}
      titleColor={config.textColor}
      moreLink={config.source === 'offers' && config.offersUrl
        ? { to: config.offersUrl, label: config.buttonText?.trim() || t('product.seeAllOffers') }
        : config.source === 'new'
          ? { to: `/catalog?${NEW_ARRIVALS_PARAM}=1`, label: config.buttonText?.trim() || t('product.seeAllNew') }
          : undefined}
    />
  );
};

// ─── Image + Text ─────────────────────────────────────────────────────────────
// Rendered as one card (image flush to its edge + text) on a plain section, so the block reads as a
// single piece between the surrounding blocks. Its backgroundColor tints the card, not the section
// (see BlockRenderer); unset, it's a soft tint of the brand color. The photo fills its half without
// setting the height — the text does, so the card stays compact whatever the image's proportions.
const ImageTextBlock: React.FC<{ config: HomeImageTextBlockConfig }> = ({ config }) => {
  const imageLeft = (config.imagePosition ?? 'left') === 'left';
  const align = config.textAlign ?? 'left';
  const textStyle: React.CSSProperties = { textAlign: align };
  if (config.textColor) textStyle.color = config.textColor;
  // --card-bg feeds the decorations (cut line, tag hole) so they follow the chosen background.
  const cardStyle = (config.backgroundColor
    ? { backgroundColor: config.backgroundColor, '--card-bg': config.backgroundColor }
    : {}) as React.CSSProperties;
  const hasImage = !!config.imageUrl;
  const deco = config.decoration ?? {};
  const cardClass = [
    'home-imagetext-card',
    hasImage ? '' : 'no-image',
    imageLeft ? '' : 'image-right',
    deco.pinking && hasImage ? 'deco-pinking' : '',
  ].filter(Boolean).join(' ');
  return (
    <Container className="home-imagetext-section">
      <div className={cardClass} style={cardStyle}>
        {hasImage && (
          <div className="home-imagetext-media">
            <img src={config.imageUrl} alt="" />
          </div>
        )}
        <div className={`home-imagetext-body align-${align}`} style={textStyle}>
          {deco.cutLine && <span className="home-imagetext-cutline" aria-hidden="true"><FaCut /><span /></span>}
          {config.eyebrow && (deco.tag
            ? <p className="home-imagetext-eyebrow is-tag"><span>{config.eyebrow}</span></p>
            : <p className="home-imagetext-eyebrow">{config.eyebrow}</p>)}
          {config.title && <h2 className="home-imagetext-title">{config.title}</h2>}
          {config.text && <p className="home-imagetext-text">{config.text}</p>}
          {config.buttonText && config.buttonUrl && (
            // Admin-authored URL (may be internal or external) — plain <a>, not <Link>. Matches
            // PageBlockRenderer's ImageTextBlock (the equivalent Page-block field).
            <div>
              <a {...blockLinkProps(config.buttonUrl)} className="btn btn-primary home-imagetext-btn">{config.buttonText}</a>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

// ─── Features (selling points strip) ──────────────────────────────────────────
const FEATURE_ICONS: Record<HomeFeatureIcon, IconType> = {
  truck: FaTruck, return: FaUndoAlt, lock: FaLock, scissors: FaCut, store: FaStore, gift: FaGift,
  phone: FaPhoneAlt, ruler: FaRulerHorizontal, leaf: FaLeaf, star: FaStar, card: FaCreditCard, clock: FaClock,
};

const FeaturesBlock: React.FC<{ config: HomeFeaturesBlockConfig }> = ({ config }) => {
  const items = (config.items ?? []).filter(item => item.title || item.text);
  if (items.length === 0) return null;
  const style = {
    '--home-features-cols': Math.min(items.length, 4),
    ...(config.backgroundColor ? { backgroundColor: config.backgroundColor } : {}),
    ...(config.textColor ? { color: config.textColor } : {}),
  } as React.CSSProperties;
  return (
    <section className="home-features" style={style}>
      <Container>
        <ul className="home-features-list">
          {items.map((item, i) => {
            const Icon = item.icon ? FEATURE_ICONS[item.icon] : undefined;
            const content = (
              <>
                {Icon && <span className="home-feature-icon" aria-hidden="true"><Icon /></span>}
                <span className="home-feature-text">
                  {item.title && <strong className="home-feature-title">{item.title}</strong>}
                  {item.text && <span className="home-feature-desc">{item.text}</span>}
                </span>
              </>
            );
            return (
              <li key={item.id ?? i}>
                {item.linkUrl
                  ? <a {...blockLinkProps(item.linkUrl)} className="home-feature home-feature-link">{content}</a>
                  : <div className="home-feature">{content}</div>}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
};

// ─── Newsletter sign-up ───────────────────────────────────────────────────────
const NewsletterBlock: React.FC<{ config: HomeNewsletterBlockConfig }> = ({ config }) => (
  <section className="home-newsletter" style={config.textColor ? { color: config.textColor } : undefined}>
    <Container>
      <NewsletterSignup title={config.title} text={config.text} buttonText={config.buttonText} />
    </Container>
  </section>
);

// ─── Block renderer with backgroundColor wrapper ──────────────────────────────
const BlockRenderer: React.FC<{ block: StorefrontHomeBlock }> = ({ block }) => {
  // ImageText applies its backgroundColor to its own card instead of the full-width section;
  // Features to its own strip (which has a default tint when none is set).
  const bg = block.type === 'ImageText' || block.type === 'Features' ? undefined : block.config?.backgroundColor;
  const wrapperStyle = bg ? { backgroundColor: bg } : undefined;

  let content: React.ReactNode = null;
  switch (block.type) {
    case 'Banner':           content = <BannerBlock config={block.config} />; break;
    case 'ImageGrid':        content = <ImageGridBlock config={block.config} />; break;
    case 'FeaturedProducts': content = <FeaturedProductsBlock config={block.config} />; break;
    case 'ImageText':        content = <ImageTextBlock config={block.config} />; break;
    case 'Features':         content = <FeaturesBlock config={block.config} />; break;
    case 'Newsletter':       content = <NewsletterBlock config={block.config} />; break;
    default:                 return null;
  }

  return wrapperStyle ? <div style={wrapperStyle}>{content}</div> : <>{content}</>;
};

// ─── Landing Page ─────────────────────────────────────────────────────────────
const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { siteName, siteDescription } = useSiteSettings();
  useDocumentMeta(siteName, siteDescription || undefined);
  const [blocks, setBlocks] = useState<StorefrontHomeBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHomeBlocks()
      .then(setBlocks)
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false));
  }, [i18n.language]);

  if (loading) {
    return <MainLayout><PageLoader /></MainLayout>;
  }

  if (blocks.length === 0) {
    return (
      <MainLayout>
        <Container className="py-5 text-center text-muted">
          <p>{t('landing.comingSoon')}</p>
          <Link to="/catalog" className="btn btn-primary">{t('landing.browseCatalog')}</Link>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {blocks.map(block => <BlockRenderer key={block.id} block={block} />)}
    </MainLayout>
  );
};

export default LandingPage;
