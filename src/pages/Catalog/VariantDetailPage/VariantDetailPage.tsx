import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaShoppingCart, FaArrowLeft, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import FavoriteButton from '../../../components/common/FavoriteButton/FavoriteButton';
import NotifyMeButton from '../../../components/common/NotifyMeButton/NotifyMeButton';
import MainLayout from '../../../components/Layout/MainLayout';
import { getVariantById } from '../../../services/productService';
import VariantCard from '../../../components/Product/VariantCard/VariantCard';
import type { StorefrontVariantDetail } from '../../../types';
import { useCart } from '../../../contexts/CartContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import CareLabels from '../../../components/common/CareLabels';
import './VariantDetailPage.css';

const MIN_QTY = 0.3;
const STEP_QTY = 0.05;
const DESC_THRESHOLD = 300;

// ── Section header ────────────────────────────────────────────────────────────
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="vdp-section-title">{children}</div>
);

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="vdp-info-row">
    <span className="vdp-info-label">{label}</span>
    <span className="vdp-info-value">{value}</span>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const VariantDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, loading: cartLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const { siteName } = useSiteSettings();

  const [variant, setVariant] = useState<StorefrontVariantDetail | null>(null);
  useDocumentMeta(
    variant ? `${variant.name} — ${siteName}` : siteName,
    variant?.description || undefined,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(MIN_QTY);
  const [descExpanded, setDescExpanded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSelectedImage(0);
    setDescExpanded(false);
    getVariantById(Number(id))
      .then(v => setVariant(v))
      .catch((e) => { if (e?.response?.status === 404) setNotFound(true); else navigate('/catalog'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <MainLayout><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></MainLayout>;
  if (notFound) return <MainLayout><Container className="py-5"><Alert variant="warning">{t('product.notFound')}</Alert></Container></MainLayout>;
  if (!variant) return null;

  const images = variant.imageUrls.length ? variant.imageUrls : variant.thumbnailUrl ? [variant.thumbnailUrl] : [];
  const outOfStock = variant.availableStock <= 0;
  const hasDiscount = variant.originalPrice > variant.price;
  const hasGroupDiscount = (variant.discountPercent ?? 0) > 0;

  const adj = (delta: number) =>
    setQuantity(q => Math.max(MIN_QTY, Math.round((q + delta) * 100) / 100));

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setError('');
    try { await addItem(undefined, variant.id, quantity); }
    catch (e) { setError((axios.isAxiosError(e) ? e.response?.data?.message : undefined) ?? t('product.addError')); }
  };

  // Composition
  let compositionText: string | null = null;
  if (variant.composition) {
    try {
      const items: { material: string; percentage: number }[] = JSON.parse(variant.composition);
      if (items.length) compositionText = items.map(i => `${i.percentage}% ${i.material}`).join(' · ');
    } catch { /* ignore */ }
  }

  // Description truncation
  const desc = variant.description ?? '';
  const longDesc = desc.length > DESC_THRESHOLD;
  const displayDesc = longDesc && !descExpanded ? desc.slice(0, DESC_THRESHOLD) + '…' : desc;

  return (
    <MainLayout>
      <Container className="py-4">
        <button className="btn btn-link p-0 mb-4 text-muted text-decoration-none small"
          onClick={() => navigate(-1)}>
          <FaArrowLeft className="me-1" size={12} /> {t('product.back')}
        </button>

        <Row className="g-5">
          {/* ── Images ── */}
          <Col md={6}>
            {/* Main image */}
            <div className="vdp-img-container">
              {images[selectedImage]
                ? <img src={images[selectedImage]} alt={variant.name} />
                : <span className="vdp-img-placeholder">📦</span>}

              {images.length > 1 && (
                <>
                  <button
                    className="vdp-nav-btn vdp-nav-btn--prev"
                    onClick={() => setSelectedImage(i => (i - 1 + images.length) % images.length)}
                    aria-label={t('product.previousImage')}
                  >
                    <FaChevronLeft size={13} />
                  </button>
                  <button
                    className="vdp-nav-btn vdp-nav-btn--next"
                    onClick={() => setSelectedImage(i => (i + 1) % images.length)}
                    aria-label={t('product.nextImage')}
                  >
                    <FaChevronRight size={13} />
                  </button>

                  <div className="vdp-dots">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        className={`vdp-dot${i === selectedImage ? ' vdp-dot--active' : ''}`}
                        onClick={() => setSelectedImage(i)}
                        aria-label={t('product.goToImage', { count: i + 1 })}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="vdp-thumb-strip">
                {images.map((url, i) => (
                  <div
                    key={i}
                    className={`vdp-thumb${i === selectedImage ? ' vdp-thumb--active' : ''}`}
                    onClick={() => setSelectedImage(i)}
                  >
                    <img src={url} alt="" />
                  </div>
                ))}
              </div>
            )}
          </Col>

          {/* ── Info ── */}
          <Col md={6}>
            {/* Breadcrumb product */}
            {variant.productName && (
              <Link to={`/product/${variant.productSlug}`} className="vdp-product-link">
                {variant.productName}
              </Link>
            )}

            {/* Title */}
            <h1 className="vdp-title">{variant.name}</h1>
            {variant.typeValue && (
              <div className="vdp-type-value">{variant.typeValue}</div>
            )}
            <div className="vdp-ref">{t('product.ref')} {variant.code}</div>

            {/* Price */}
            <div className="vdp-price-row">
              <span className="vdp-price">{variant.price.toFixed(2)} €</span>
              {(hasDiscount || hasGroupDiscount) && (
                <span className="vdp-price-original">{variant.originalPrice.toFixed(2)} €</span>
              )}
              {hasGroupDiscount
                ? <Badge bg="success">−{variant.discountPercent}%</Badge>
                : hasDiscount && <Badge bg="danger">{t('product.offer')}</Badge>}
            </div>
            <div className="vdp-price-unit">{t('product.priceUnit')}</div>

            {/* Stock */}
            <div className="vdp-stock">
              {outOfStock
                ? <Badge bg="secondary">{t('product.outOfStock')}</Badge>
                : variant.availableStock <= 5
                  ? <Badge bg="warning" text="dark">{t('product.stockWarning', { count: variant.availableStock })}</Badge>
                  : <Badge bg="success" style={{ fontWeight: 500 }}>{t('product.inStock')}</Badge>}
            </div>

            {/* Quantity stepper + add to cart */}
            <div className="vdp-actions">
              <div className="vdp-stepper">
                <button className="vdp-stepper-btn" disabled={outOfStock || quantity <= MIN_QTY}
                  onClick={() => adj(-STEP_QTY)}>−</button>
                <input
                  className="vdp-stepper-input"
                  type="number" value={quantity} min={MIN_QTY} step={STEP_QTY}
                  disabled={outOfStock}
                  onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= MIN_QTY) setQuantity(Math.round(v * 100) / 100); }}
                />
                <button className="vdp-stepper-btn" disabled={outOfStock} onClick={() => adj(STEP_QTY)}>+</button>
              </div>
              <Button
                variant="dark" size="lg" className="flex-grow-1 fw-semibold vdp-add-btn"
                disabled={outOfStock || cartLoading}
                onClick={handleAddToCart}
              >
                <FaShoppingCart className="me-2" />
                {outOfStock ? t('product.outOfStock') : t('product.addToCart')}
              </Button>
              <FavoriteButton variantId={variant.id} size="lg" />
            </div>
            {outOfStock && (
              <div className="vdp-notify mt-2">
                <NotifyMeButton variantId={variant.id} size="lg" className="w-100" />
              </div>
            )}
            <div className="vdp-meters">{t('product.meters')}</div>

            {error && <Alert variant="danger" className="py-2 mb-3">{error}</Alert>}

            {/* Description */}
            {desc && (
              <div className="vdp-desc">
                <SectionTitle>{t('product.description')}</SectionTitle>
                <p className="vdp-desc-text">{displayDesc}</p>
                {longDesc && (
                  <button className="vdp-read-more" onClick={() => setDescExpanded(x => !x)}>
                    {descExpanded ? t('product.readLess') : t('product.readMore')}
                  </button>
                )}
              </div>
            )}

            {/* Information */}
            {(variant.width > 0 || variant.weight > 0 || compositionText || variant.fabricType || variant.fall || variant.texture) && (
              <div>
                <SectionTitle>{t('product.info')}</SectionTitle>
                {variant.width > 0 && <InfoRow label={t('product.width')} value={`${variant.width} ${t('product.widthUnit')}`} />}
                {variant.weight > 0 && <InfoRow label={t('product.weightApprox')} value={`${variant.weight} ${t('product.weightUnit')}`} />}
                {compositionText && <InfoRow label={t('product.composition')} value={compositionText} />}
                {variant.fabricType && <InfoRow label={t('product.fabricType')} value={variant.fabricType} />}
                {variant.fall && <InfoRow label={t('product.fall')} value={variant.fall} />}
                {variant.texture && <InfoRow label={t('product.texture')} value={variant.texture} />}
              </div>
            )}

            {/* Care labels */}
            {(variant.careLabels ?? 0) > 0 && (
              <div className="vdp-care">
                <SectionTitle>{t('product.careInstructions')}</SectionTitle>
                <CareLabels careLabels={variant.careLabels!} />
              </div>
            )}
          </Col>
        </Row>

        {/* Related variants */}
        {variant.siblings && variant.siblings.length > 0 && (
          <div className="vdp-related">
            <SectionTitle>{t('product.related')}</SectionTitle>
            <Row xs={2} sm={2} md={3} lg={4} className="g-3 mt-1">
              {variant.siblings.map(s => (
                <Col key={s.id}><VariantCard variant={s} /></Col>
              ))}
            </Row>
          </div>
        )}
      </Container>
    </MainLayout>
  );
};

export default VariantDetailPage;
