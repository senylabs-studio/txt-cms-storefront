import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Spinner, Alert, Form } from 'react-bootstrap';
import { FaShoppingCart, FaArrowLeft, FaChevronLeft, FaChevronRight, FaStar, FaRegStar, FaRulerHorizontal } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import FavoriteButton from '../../../components/common/FavoriteButton/FavoriteButton';
import BoardButton from '../../../components/common/BoardButton/BoardButton';
import NotifyMeButton from '../../../components/common/NotifyMeButton/NotifyMeButton';
import RulerOverlay from '../../../components/common/RulerOverlay/RulerOverlay';
import MainLayout from '../../../components/Layout/MainLayout';
import { getVariantById } from '../../../services/productService';
import { getProductReviews, getMyReview, submitReview } from '../../../services/reviewService';
import VariantCard from '../../../components/Product/VariantCard/VariantCard';
import type { StorefrontVariantDetail, ProductReview, MyReviewStatus } from '../../../types';
import { useCart } from '../../../contexts/CartContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import CareLabels from '../../../components/common/CareLabels';
import './VariantDetailPage.css';

const DEFAULT_MIN_QTY = 0.3;
const DESC_THRESHOLD = 300;

// ── Section header ────────────────────────────────────────────────────────────
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="vdp-section-title">{children}</div>
);

// ── Star rating (display, or interactive when onChange is given) ──────────────
const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; size?: number }> = ({ value, onChange, size = 16 }) => (
  <span className="text-warning" style={{ cursor: onChange ? 'pointer' : undefined }}>
    {Array.from({ length: 5 }, (_, i) => {
      const filled = i < Math.round(value);
      const Icon = filled ? FaStar : FaRegStar;
      return <Icon key={i} size={size} onClick={onChange ? () => onChange(i + 1) : undefined} />;
    })}
  </span>
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
  const { t, i18n } = useTranslation();
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
  const [rulerActive, setRulerActive] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [quantity, setQuantity] = useState(DEFAULT_MIN_QTY);
  const [descExpanded, setDescExpanded] = useState(false);
  const [error, setError] = useState('');

  const minQty = variant?.minQuantity ?? DEFAULT_MIN_QTY;
  const stepQty = variant?.quantityStep ?? 0.05;

  // Reviews
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(0);
  const [myReview, setMyReview] = useState<MyReviewStatus | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSelectedImage(0);
    setDescExpanded(false);
    getVariantById(Number(id))
      .then(v => { setVariant(v); setQuantity(v.minQuantity); })
      .catch((e) => { if (e?.response?.status === 404) setNotFound(true); else navigate('/catalog'); })
      .finally(() => setLoading(false));
  }, [id, i18n.language]);

  useEffect(() => {
    if (!variant?.productSlug) return;
    setReviewsPage(1);
    getProductReviews(variant.productSlug, 1).then(r => {
      setReviews(r.items);
      setReviewsTotalPages(r.totalPages);
    }).catch(() => {});

    if (isAuthenticated) {
      getMyReview(variant.productSlug).then(status => {
        setMyReview(status);
        if (status.review) { setReviewRating(status.review.rating); setReviewComment(status.review.comment ?? ''); }
      }).catch(() => {});
    } else {
      setMyReview(null);
    }
  }, [variant?.productSlug, isAuthenticated]);

  const changeReviewsPage = (page: number) => {
    if (!variant?.productSlug) return;
    setReviewsPage(page);
    getProductReviews(variant.productSlug, page).then(r => {
      setReviews(r.items);
      setVariant(prev => prev ? { ...prev, averageRating: r.averageRating ?? undefined, reviewCount: r.reviewCount } : prev);
    }).catch(() => {});
  };

  const handleSubmitReview = async () => {
    if (!variant?.productSlug || reviewRating < 1) return;
    setSubmittingReview(true);
    setReviewMsg(null);
    try {
      const saved = await submitReview(variant.productSlug, reviewRating, reviewComment.trim() || undefined);
      setMyReview(prev => prev ? { ...prev, review: saved } : { hasPurchased: true, review: saved });
      setReviewMsg({ type: 'success', text: t('product.reviewSaved') });
      changeReviewsPage(1);
    } catch {
      setReviewMsg({ type: 'danger', text: t('product.reviewSaveError') });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <MainLayout><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></MainLayout>;
  if (notFound) return <MainLayout><Container className="py-5"><Alert variant="warning">{t('product.notFound')}</Alert></Container></MainLayout>;
  if (!variant) return null;

  const images = variant.images.length
    ? variant.images
    : variant.thumbnailUrl ? [{ url: variant.thumbnailUrl, isRealScale: false }] : [];
  const currentImage = images[selectedImage];
  const canMeasure = !!(currentImage?.isRealScale && currentImage.realWidthCm);
  const outOfStock = variant.availableStock <= 0;
  const hasDiscount = variant.originalPrice > variant.price;
  const hasGroupDiscount = (variant.discountPercent ?? 0) > 0;

  const adj = (delta: number) =>
    setQuantity(q => Math.max(minQty, Math.round((q + delta) * 100) / 100));

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
            <div className="vdp-img-container" ref={imgContainerRef}>
              {currentImage
                ? <img ref={imgRef} src={currentImage.url} alt={variant.name} />
                : <span className="vdp-img-placeholder">📦</span>}

              {canMeasure && rulerActive && (
                <RulerOverlay containerRef={imgContainerRef} imgRef={imgRef} realWidthCm={currentImage!.realWidthCm!} />
              )}

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
                {images.map((img, i) => (
                  <div
                    key={i}
                    className={`vdp-thumb${i === selectedImage ? ' vdp-thumb--active' : ''}`}
                    onClick={() => setSelectedImage(i)}
                  >
                    <img src={img.url} alt="" />
                  </div>
                ))}
              </div>
            )}

            {canMeasure && (
              <Button
                variant={rulerActive ? 'dark' : 'outline-dark'}
                size="sm"
                className="vdp-measure-btn"
                onClick={() => setRulerActive(a => !a)}
              >
                <FaRulerHorizontal className="me-2" />
                {rulerActive ? t('product.measureHide') : t('product.measure')}
              </Button>
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

            {variant.reviewCount > 0 && (
              <div className="d-flex align-items-center gap-2 mb-2">
                <StarRating value={variant.averageRating ?? 0} />
                <span className="text-muted small">{t('product.reviewCount', { count: variant.reviewCount })}</span>
              </div>
            )}

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
                <button className="vdp-stepper-btn" disabled={outOfStock || quantity <= minQty}
                  onClick={() => adj(-stepQty)}>−</button>
                <input
                  className="vdp-stepper-input"
                  type="number" value={quantity} min={minQty} step={stepQty}
                  disabled={outOfStock}
                  onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= minQty) setQuantity(Math.round(v * 100) / 100); }}
                />
                <button className="vdp-stepper-btn" disabled={outOfStock} onClick={() => adj(stepQty)}>+</button>
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
              <BoardButton variantId={variant.id} size="lg" />
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

        {/* Related variants (same product) */}
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

        {/* Frequently bought together (across products) — falls back to same-category
            suggestions when there's no real co-purchase data yet, see alsoBoughtIsFallback. */}
        {variant.alsoBought && variant.alsoBought.length > 0 && (
          <div className="vdp-related">
            <SectionTitle>{variant.alsoBoughtIsFallback ? t('product.youMightAlsoLike') : t('product.alsoBought')}</SectionTitle>
            <Row xs={2} sm={2} md={3} lg={4} className="g-3 mt-1">
              {variant.alsoBought.map(s => (
                <Col key={s.id}><VariantCard variant={s} /></Col>
              ))}
            </Row>
          </div>
        )}

        {/* Reviews */}
        <div id="reviews" className="vdp-reviews mt-5">
          <SectionTitle>{t('product.reviewsTitle')}</SectionTitle>

          {myReview?.hasPurchased && (
            <div className="border rounded p-3 mb-4 mt-2" style={{ maxWidth: 480 }}>
              <div className="fw-semibold mb-2">
                {myReview.review ? t('product.editYourReview') : t('product.writeReview')}
              </div>
              {reviewMsg && <Alert variant={reviewMsg.type} className="py-2">{reviewMsg.text}</Alert>}
              <div className="mb-2"><StarRating value={reviewRating} onChange={setReviewRating} size={22} /></div>
              <Form.Control
                as="textarea"
                rows={3}
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder={t('product.reviewCommentPlaceholder')}
                className="mb-2"
              />
              <Button size="sm" variant="dark" disabled={submittingReview || reviewRating < 1} onClick={handleSubmitReview}>
                {t('product.submitReview')}
              </Button>
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="text-muted">{t('product.noReviews')}</p>
          ) : (
            <>
              {reviews.map(r => (
                <div key={r.id} className="border-bottom py-3">
                  <div className="d-flex align-items-center gap-2">
                    <StarRating value={r.rating} size={13} />
                    <span className="fw-semibold small">{r.customerName}</span>
                    <span className="text-muted small">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="mb-0 mt-1 small">{r.comment}</p>}
                </div>
              ))}
              {reviewsTotalPages > 1 && (
                <div className="d-flex gap-2 mt-3">
                  <Button size="sm" variant="outline-secondary" disabled={reviewsPage <= 1} onClick={() => changeReviewsPage(reviewsPage - 1)}>
                    {t('product.previousPage')}
                  </Button>
                  <Button size="sm" variant="outline-secondary" disabled={reviewsPage >= reviewsTotalPages} onClick={() => changeReviewsPage(reviewsPage + 1)}>
                    {t('product.nextPage')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Container>
    </MainLayout>
  );
};

export default VariantDetailPage;
