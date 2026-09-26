import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Carousel } from 'react-bootstrap';
import { Link } from 'react-router-dom';
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
} from '../../services/homeService';
import FeaturedProductsGrid from '../../components/common/FeaturedProductsGrid/FeaturedProductsGrid';
import { bannerTextPlacement } from '../../utils/bannerTextPlacement';
import { blockLinkProps } from '../../utils/blockLinkProps';
import './LandingPage.css';
import ScissorsLoader from '../../components/common/ScissorsLoader/ScissorsLoader';

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
    <div className="home-banner-overlay" style={overlayStyle}>
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
  const height = config.height ?? 500;

  if (slides.length === 0) return null;

  if (slides.length === 1) {
    const slide = slides[0];
    return (
      <div
        className="home-banner"
        style={{ backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined, minHeight: height, ...bannerTextPlacement(slide.textAlign, slide.textVerticalAlign) }}
      >
        <BannerSlideContent slide={slide} />
      </div>
    );
  }

  return (
    <Carousel fade interval={(config.intervalSeconds ?? 5) * 1000} className="home-carousel" style={{ minHeight: height }}>
      {slides.map((slide, i) => (
        <Carousel.Item key={i} style={{ minHeight: height }}>
          <div
            className="home-banner"
            style={{ backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined, minHeight: height, ...bannerTextPlacement(slide.textAlign, slide.textVerticalAlign) }}
          >
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
  const colSize = Math.max(2, Math.floor(12 / images.length)) as 2 | 3 | 4 | 6 | 12;
  const titleStyle: React.CSSProperties = { textAlign: config.textAlign ?? 'center' };
  if (config.textColor) titleStyle.color = config.textColor;
  return (
    <Container className="py-4">
      {config.title && <h2 className="mb-4 fw-bold" style={titleStyle}>{config.title}</h2>}
      <Row className="g-3">
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
const FeaturedProductsBlock: React.FC<{ config: HomeFeaturedProductsBlockConfig }> = ({ config }) => (
  <FeaturedProductsGrid
    title={config.title}
    variants={config.variants}
    products={config.products}
    titleAlign={config.textAlign}
    titleColor={config.textColor}
  />
);

// ─── Image + Text ─────────────────────────────────────────────────────────────
// Rendered as one card (image flush to its edge + text) on a plain section, so the block reads as a
// single piece between the surrounding blocks. Its backgroundColor tints the card, not the section
// (see BlockRenderer); unset, it's a soft tint of the brand color.
const ImageTextBlock: React.FC<{ config: HomeImageTextBlockConfig }> = ({ config }) => {
  const imageLeft = (config.imagePosition ?? 'left') === 'left';
  const align = config.textAlign ?? 'left';
  const textStyle: React.CSSProperties = { textAlign: align };
  if (config.textColor) textStyle.color = config.textColor;
  const cardStyle: React.CSSProperties = config.backgroundColor ? { backgroundColor: config.backgroundColor } : {};
  const hasImage = !!config.imageUrl;
  return (
    <Container className="home-imagetext-section">
      <div className={`home-imagetext-card${hasImage ? '' : ' no-image'}${imageLeft ? '' : ' image-right'}`} style={cardStyle}>
        {hasImage && (
          <div className="home-imagetext-media">
            <img src={config.imageUrl} alt="" />
          </div>
        )}
        <div className={`home-imagetext-body align-${align}`} style={textStyle}>
          {config.eyebrow && <p className="home-imagetext-eyebrow">{config.eyebrow}</p>}
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

// ─── Block renderer with backgroundColor wrapper ──────────────────────────────
const BlockRenderer: React.FC<{ block: StorefrontHomeBlock }> = ({ block }) => {
  // ImageText applies its backgroundColor to its own card instead of the full-width section.
  const bg = block.type === 'ImageText' ? undefined : block.config?.backgroundColor;
  const wrapperStyle = bg ? { backgroundColor: bg } : undefined;

  let content: React.ReactNode = null;
  switch (block.type) {
    case 'Banner':           content = <BannerBlock config={block.config} />; break;
    case 'ImageGrid':        content = <ImageGridBlock config={block.config} />; break;
    case 'FeaturedProducts': content = <FeaturedProductsBlock config={block.config} />; break;
    case 'ImageText':        content = <ImageTextBlock config={block.config} />; break;
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
    return <MainLayout><div className="text-center py-5"><ScissorsLoader /></div></MainLayout>;
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
