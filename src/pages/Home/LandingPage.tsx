import React, { useEffect, useState } from 'react';
import { Container, Spinner, Row, Col, Button, Badge, Carousel } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaShoppingCart } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import {
  getHomeBlocks,
  type StorefrontHomeBlock,
  type HomeBannerBlockConfig,
  type HomeImageGridBlockConfig,
  type HomeFeaturedProductsBlockConfig,
  type HomeFeaturedItem,
  type HomeImageTextBlockConfig,
} from '../../services/homeService';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

// ─── Banner (carousel) ────────────────────────────────────────────────────────
const BannerBlock: React.FC<{ config: HomeBannerBlockConfig }> = ({ config }) => {
  const slides = config.slides ?? [];
  const height = config.height ?? 500;

  if (slides.length === 0) return null;

  if (slides.length === 1) {
    const slide = slides[0];
    return (
      <div
        className="home-banner"
        style={{ backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined, minHeight: height }}
      >
        <div className="home-banner-overlay">
          {slide.title && <h1 className="home-banner-title">{slide.title}</h1>}
          {slide.subtitle && <p className="home-banner-subtitle">{slide.subtitle}</p>}
          {slide.buttonText && slide.buttonUrl && (
            <Link to={slide.buttonUrl} className="btn btn-light btn-lg px-4">{slide.buttonText}</Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <Carousel fade interval={5000} className="home-carousel" style={{ minHeight: height }}>
      {slides.map((slide, i) => (
        <Carousel.Item key={i} style={{ minHeight: height }}>
          <div
            className="home-banner"
            style={{ backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined, minHeight: height }}
          >
            <div className="home-banner-overlay">
              {slide.title && <h1 className="home-banner-title">{slide.title}</h1>}
              {slide.subtitle && <p className="home-banner-subtitle">{slide.subtitle}</p>}
              {slide.buttonText && slide.buttonUrl && (
                <Link to={slide.buttonUrl} className="btn btn-light btn-lg px-4">{slide.buttonText}</Link>
              )}
            </div>
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
  return (
    <Container className="py-4">
      {config.title && <h2 className="text-center mb-4 fw-bold">{config.title}</h2>}
      <Row className="g-3">
        {images.map((img, i) => (
          <Col key={i} xs={6} sm={4} md={colSize}>
            {img.linkUrl ? (
              <Link to={img.linkUrl} className="d-block">
                <div className="home-image-grid-item">
                  <img src={img.imageUrl} alt={img.caption ?? ''} className="w-100 h-100 object-fit-cover" />
                  {img.caption && <div className="home-image-grid-caption">{img.caption}</div>}
                </div>
              </Link>
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
type FeaturedItem = HomeFeaturedItem & { _isVariant: boolean };

const FeaturedProductsBlock: React.FC<{ config: HomeFeaturedProductsBlockConfig }> = ({ config }) => {
  const { t } = useTranslation();
  const { addItem, loading: cartLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const variants = config.variants ?? [];
  const products = config.products ?? [];
  const allItems: FeaturedItem[] = [
    ...variants.map(v => ({ ...v, _isVariant: true })),
    ...products.map(p => ({ ...p, _isVariant: false })),
  ];

  if (allItems.length === 0) return null;

  const handleAdd = async (e: React.MouseEvent, item: FeaturedItem) => {
    e.preventDefault();
    if (!isAuthenticated) { navigate('/login'); return; }
    if (item._isVariant) await addItem(undefined, item.id, 1);
    else if (!item.hasVariants) await addItem(item.id, undefined, 1);
    else navigate(`/product/${item.slug}`);
  };

  return (
    <Container className="py-4">
      {config.title && <h2 className="text-center mb-4 fw-bold">{config.title}</h2>}
      <Row className="g-3 justify-content-center">
        {allItems.map(item => {
          const slug = item._isVariant ? `/variant/${item.id}` : `/product/${item.slug}`;
          const outOfStock = item.availableStock <= 0;
          const hasDiscount = item.originalPrice > item.price;
          const hasGroupDiscount = (item.discountPercent ?? 0) > 0;
          const thumbnail = item.thumbnailUrl ?? item.imageUrls?.[0];

          return (
            <Col key={`${item._isVariant ? 'v' : 'p'}-${item.id}`} xs={6} sm={4} md={3} lg={2}>
              <div className="home-featured-card h-100">
                <Link to={slug} className="d-block position-relative">
                  {thumbnail
                    ? <img src={thumbnail} alt={item.name} className="home-featured-img" />
                    : <div className="home-featured-placeholder">📦</div>}
                  {(hasDiscount || hasGroupDiscount) && (
                    <Badge bg="danger" className="position-absolute top-0 start-0 m-2" style={{ fontSize: 10 }}>
                      {hasGroupDiscount ? `−${item.discountPercent}%` : t('product.offer')}
                    </Badge>
                  )}
                  {outOfStock && <div className="home-featured-outofstock">{t('product.outOfStock')}</div>}
                </Link>
                <div className="p-2">
                  <div className="home-featured-name"><Link to={slug}>{item.name}</Link></div>
                  <div className="d-flex align-items-baseline gap-1 mt-1">
                    <span className="fw-bold text-danger">€{item.price?.toFixed(2)}</span>
                    {(hasDiscount || hasGroupDiscount) && (
                      <span className="text-muted text-decoration-line-through small">€{item.originalPrice?.toFixed(2)}</span>
                    )}
                  </div>
                  <Button
                    variant={outOfStock ? 'outline-secondary' : 'primary'}
                    size="sm" className="w-100 mt-2"
                    disabled={outOfStock || cartLoading}
                    onClick={e => handleAdd(e, item)}
                  >
                    <FaShoppingCart className="me-1" />
                    {outOfStock ? t('product.outOfStock') : !item._isVariant && item.hasVariants ? t('product.viewOptions') : t('product.add')}
                  </Button>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

// ─── Image + Text ─────────────────────────────────────────────────────────────
const ImageTextBlock: React.FC<{ config: HomeImageTextBlockConfig }> = ({ config }) => {
  const imageLeft = (config.imagePosition ?? 'left') === 'left';
  return (
    <Container className="py-5">
      <Row className="align-items-center g-4">
        {imageLeft && config.imageUrl && (
          <Col md={5}>
            <img src={config.imageUrl} alt="" className="w-100 rounded shadow-sm" style={{ objectFit: 'cover', maxHeight: 360 }} />
          </Col>
        )}
        <Col md={config.imageUrl ? 7 : 12}>
          {config.title && <h2 className="fw-bold mb-3">{config.title}</h2>}
          <p style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>{config.text}</p>
          {config.buttonText && config.buttonUrl && (
            <Link to={config.buttonUrl} className="btn btn-primary mt-2">{config.buttonText}</Link>
          )}
        </Col>
        {!imageLeft && config.imageUrl && (
          <Col md={5}>
            <img src={config.imageUrl} alt="" className="w-100 rounded shadow-sm" style={{ objectFit: 'cover', maxHeight: 360 }} />
          </Col>
        )}
      </Row>
    </Container>
  );
};

// ─── Block renderer with backgroundColor wrapper ──────────────────────────────
const BlockRenderer: React.FC<{ block: StorefrontHomeBlock }> = ({ block }) => {
  const bg = block.config?.backgroundColor;
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
  const { t } = useTranslation();
  const [blocks, setBlocks] = useState<StorefrontHomeBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHomeBlocks()
      .then(setBlocks)
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <MainLayout><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></MainLayout>;
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
