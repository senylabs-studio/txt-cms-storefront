import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Alert, Form } from 'react-bootstrap';
import { FaShoppingCart, FaArrowLeft, FaChevronLeft, FaChevronRight, FaStar, FaRegStar, FaRulerHorizontal, FaExpand } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import FavoriteButton from '../../../components/common/FavoriteButton/FavoriteButton';
import BoardButton from '../../../components/common/BoardButton/BoardButton';
import NotifyMeButton from '../../../components/common/NotifyMeButton/NotifyMeButton';
import RulerOverlay from '../../../components/common/RulerOverlay/RulerOverlay';
import ImageLightbox from '../../../components/common/ImageLightbox/ImageLightbox';
import IconTooltip from '../../../components/common/IconTooltip/IconTooltip';
import MainLayout from '../../../components/Layout/MainLayout';
import { getVariantById, getVariantMatches, getVariantsBatch } from '../../../services/productService';
import { getVariantReviews, getMyReview, submitReview } from '../../../services/reviewService';
import VariantCard from '../../../components/Product/VariantCard/VariantCard';
import type { StorefrontVariantDetail, StorefrontVariant, ProductReview, MyReviewStatus } from '../../../types';
import { recordVariantView, getRecentlyViewedIds } from '../../../utils/recentlyViewed';
import { useCart } from '../../../contexts/CartContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useAuthGate } from '../../../contexts/AuthGateContext';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import CareLabels from '../../../components/common/CareLabels';
import { getApiErrorMessage } from '../../../utils/apiError';
import NewBadge from '../../../components/common/NewBadge/NewBadge';
import { useMaterialAbbreviations } from '../../../hooks/useMaterialAbbreviations';
import { useFabricGuide, fabricGuideFibreHref } from '../../../hooks/useFabricGuide';
import './VariantDetailPage.css';
import PageLoader from '../../../components/common/ScissorsLoader/PageLoader';
import { formatPrice } from '../../../utils/pricing';
import { parseFabricColors } from '../../../utils/fabricColors';
import { formatDate } from '../../../utils/locale';
import MetresInput from '../../../components/common/MetresInput/MetresInput';

const DEFAULT_MIN_QTY = 0.3;
const DESC_THRESHOLD = 300;

// ── Section header ────────────────────────────────────────────────────────────
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="vdp-section-title">{children}</div>
);

// ── Star rating (display, or interactive when onChange is given) ──────────────
// Interactive: a radio group of buttons (keyboard and screen readers can rate too — the stars
// were click-only icons, so a review couldn't be written without a mouse).
const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; size?: number }> = ({ value, onChange, size = 16 }) => {
  const { t } = useTranslation();
  if (!onChange) return (
    <span className="text-warning" role="img" aria-label={t('product.ratingOf', { value: Math.round(value) })}>
      {Array.from({ length: 5 }, (_, i) => {
        const Icon = i < Math.round(value) ? FaStar : FaRegStar;
        return <Icon key={i} size={size} aria-hidden />;
      })}
    </span>
  );
  return (
    <span className="text-warning" role="radiogroup" aria-label={t('product.rating')}>
      {Array.from({ length: 5 }, (_, i) => {
        const Icon = i < Math.round(value) ? FaStar : FaRegStar;
        return (
          <button key={i} type="button" role="radio" aria-checked={Math.round(value) === i + 1}
            aria-label={t('product.ratingOf', { value: i + 1 })}
            className="btn btn-link p-0 me-1 text-warning" onClick={() => onChange(i + 1)}>
            <Icon size={size} aria-hidden />
          </button>
        );
      })}
    </span>
  );
};

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="vdp-info-row">
    <span className="vdp-info-label">{label}</span>
    <span className="vdp-info-value">{value}</span>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const canHover = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

const VariantDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, loading: cartLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useAuthGate();
  const { siteName } = useSiteSettings();

  const [variant, setVariant] = useState<StorefrontVariantDetail | null>(null);
  // The variant the page is showing now (the route id). Reviews are per variant, so a reviews
  // page or a submit answered after moving to another variant must be dropped.
  const currentIdRef = useRef(Number(id));
  currentIdRef.current = Number(id);
  useDocumentMeta(
    variant ? `${variant.name} — ${siteName}` : siteName,
    variant?.description || undefined,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // A failed load that isn't a 404 (server error, timeout): said so with a retry, instead of
  // silently sending the shopper to the catalog.
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // The quantity resets for a new fabric, not when the same one is reloaded in another language.
  const quantityForId = useRef<string | undefined>(undefined);
  // «Dejar una reseña» links here with #reviews: the section renders after the variant loads,
  // so the browser's own jump to it never happened — scroll once it's there.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== '#reviews' || loading || !variant) return;
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, loading, variant]);
  // Each fibre in the composition links to its section of the fabric guide (when the shop has one).
  const fibreCodes = useMaterialAbbreviations();
  const hasFabricGuide = useFabricGuide();
  const [selectedImage, setSelectedImage] = useState(0);
  const [rulerActive, setRulerActive] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Hover magnifier: where the cursor is over the main image (in %), null when not hovering.
  const [lensAt, setLensAt] = useState<{ x: number; y: number } | null>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [quantity, setQuantity] = useState(DEFAULT_MIN_QTY);
  const [descExpanded, setDescExpanded] = useState(false);
  const [error, setError] = useState('');

  const minQty = variant?.minQuantity ?? DEFAULT_MIN_QTY;
  const stepQty = variant?.quantityStep ?? 0.05;

  // Reviews
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(0);
  const [myReview, setMyReview] = useState<MyReviewStatus | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Recently viewed
  const [recentlyViewed, setRecentlyViewed] = useState<StorefrontVariant[]>([]);
  // "Combina con", both ways round, without repeats
  const [goesWith, setGoesWith] = useState<StorefrontVariant[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setGoesWith([]);
    getVariantMatches(Number(id))
      .then(({ matches, matchedBy }) => {
        if (cancelled) return;
        const seen = new Set(matches.map(v => v.id));
        setGoesWith([...matches, ...matchedBy.filter(v => !seen.has(v.id))]);
      })
      // A suggestion rail: on failure it just doesn't show, like "recently viewed".
      .catch(() => { if (!cancelled) setGoesWith([]); });
    // Same stale-response guard as the main variant fetch: in-page links keep this component mounted.
    return () => { cancelled = true; };
  }, [id, i18n.language]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadFailed(false);
    const sameFabric = quantityForId.current === id;
    if (!sameFabric) {
      setSelectedImage(0);
      setRulerActive(false);
      setDescExpanded(false);
    }
    getVariantById(Number(id))
      .then(v => {
        if (cancelled) return;
        setVariant(v);
        if (!sameFabric) setQuantity(v.minQuantity);
        quantityForId.current = id;
      })
      .catch((e) => { if (!cancelled) { if (e?.response?.status === 404) setNotFound(true); else setLoadFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    // In-page "siblings"/"also bought"/"recently viewed" links navigate to another
    // /variant/:id without unmounting this component, and the browser Back/Forward buttons can
    // do the same — without this guard, an older id's slower response could resolve after a
    // newer id's and silently overwrite the page with the wrong variant's data while the URL
    // still shows the new id.
    return () => { cancelled = true; };
  }, [id, i18n.language, reloadKey]);

  useEffect(() => {
    if (!variant?.id) return;
    let cancelled = false;
    // Reviews are per variant. Sibling/"also bought"/"recently viewed" links switch to another
    // variant without unmounting this page — everything review-related must start clean, or the
    // previous variant's reviews and (worse) the customer's own rating/comment for it would stay
    // in the form and could be submitted as a review of this one.
    setReviews([]);
    setReviewsPage(1);
    setReviewsTotalPages(0);
    setReviewsError('');
    setMyReview(null);
    setReviewRating(0);
    setReviewComment('');
    setReviewMsg(null);
    getVariantReviews(variant.id, 1).then(r => {
      if (cancelled) return;
      setReviews(r.items);
      setReviewsTotalPages(r.totalPages);
    }).catch(err => { if (!cancelled) setReviewsError(getApiErrorMessage(err, t('product.reviewsLoadError'))); });

    if (isAuthenticated) {
      getMyReview(variant.id).then(status => {
        if (cancelled) return;
        setMyReview(status);
        if (status.review) { setReviewRating(status.review.rating); setReviewComment(status.review.comment ?? ''); }
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t only formats the load-error message; re-running would reset the review form
  }, [variant?.id, isAuthenticated]);

  useEffect(() => {
    if (!variant) return;
    let cancelled = false;
    recordVariantView(variant.id);
    const ids = getRecentlyViewedIds(variant.id);
    if (ids.length === 0) { setRecentlyViewed([]); return; }
    getVariantsBatch(ids)
      .then(v => { if (!cancelled) setRecentlyViewed(v); })
      .catch(() => { if (!cancelled) setRecentlyViewed([]); });
    // Same stale-response concern as the main variant-fetch effect above: following an in-page
    // link to another variant doesn't unmount this component, so an older variant's slower
    // "recently viewed" batch could resolve after a newer one's and overwrite the rail with a
    // stale list (missing the variant the customer is now actually viewing).
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the variant id on purpose: the variant object changes on every rating refresh
  }, [variant?.id]);

  const changeReviewsPage = (page: number, variantId = variant?.id) => {
    if (!variantId) return;
    setReviewsPage(page);
    setReviewsError('');
    getVariantReviews(variantId, page).then(r => {
      if (currentIdRef.current !== variantId) return;
      setReviews(r.items);
      setVariant(prev => prev && prev.id === variantId ? { ...prev, averageRating: r.averageRating ?? undefined, reviewCount: r.reviewCount } : prev);
    }).catch(err => {
      if (currentIdRef.current === variantId) setReviewsError(getApiErrorMessage(err, t('product.reviewsLoadError')));
    });
  };

  const handleSubmitReview = async () => {
    const variantId = variant?.id;
    if (!variantId || reviewRating < 1) return;
    setSubmittingReview(true);
    setReviewMsg(null);
    try {
      const saved = await submitReview(variantId, reviewRating, reviewComment.trim() || undefined);
      if (currentIdRef.current !== variantId) return; // saved, but the customer is on another variant now
      setMyReview(prev => prev ? { ...prev, review: saved } : { hasPurchased: true, review: saved });
      setReviewMsg({ type: 'success', text: t('product.reviewSaved') });
      changeReviewsPage(1, variantId);
    } catch (err) {
      if (currentIdRef.current === variantId) setReviewMsg({ type: 'danger', text: getApiErrorMessage(err, t('product.reviewSaveError')) });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <MainLayout><PageLoader /></MainLayout>;
  if (notFound) return <MainLayout><Container className="py-5"><Alert variant="warning">{t('product.notFound')}</Alert></Container></MainLayout>;
  if (loadFailed) return (
    <MainLayout><Container className="py-5">
      <Alert variant="danger" className="d-flex align-items-center justify-content-between gap-2">
        <span>{t('common.pageLoadError')}</span>
        <Button size="sm" variant="outline-danger" onClick={() => setReloadKey(k => k + 1)}>{t('checkout.shippingRetry')}</Button>
      </Alert>
    </Container></MainLayout>
  );
  if (!variant) return null;

  const images = variant.images.length
    ? variant.images
    : variant.thumbnailUrl ? [{ url: variant.thumbnailUrl, isRealScale: false }] : [];
  const currentImage = images[selectedImage];
  const canMeasure = !!(currentImage?.isRealScale && currentImage.realWidthCm);
  // Only with a real mouse (touch has no hover — a tap opens the viewer instead), and never over
  // the tape measure: magnifying the photo would make its cm marks wrong.
  // Only while the tape is actually shown: a photo without a real scale hides it (and its toggle),
  // and the magnifier must not stay off for it.
  const lensEnabled = !!currentImage && !(canMeasure && rulerActive) && canHover();
  const outOfStock = variant.availableStock <= 0;
  const hasDiscount = variant.originalPrice > variant.price;
  const hasGroupDiscount = (variant.discountPercent ?? 0) > 0;

  const adj = (delta: number) =>
    setQuantity(q => Math.max(minQty, Math.round((q + delta) * 100) / 100));

  const handleAddToCart = async () => {
    const ok = await requireAuth();
    if (!ok) return;
    setError('');
    try { await addItem(undefined, variant.id, quantity); }
    catch (e) { setError(getApiErrorMessage(e, t('product.addError'))); }
  };

  // Composition
  let compositionText: React.ReactNode = null;
  if (variant.composition) {
    try {
      const items: { material: string; percentage: number }[] = JSON.parse(variant.composition);
      if (items.length) compositionText = items.map((i, n) => {
        const code = hasFabricGuide ? fibreCodes.get(i.material.toLowerCase()) : undefined;
        return (
          <React.Fragment key={n}>
            {n > 0 && ' · '}
            {i.percentage}%{' '}
            {code
              ? <Link to={fabricGuideFibreHref(code)} className="vdp-fibre-link" title={t('product.fibreGuideLink', { material: i.material })}>{i.material}</Link>
              : i.material}
          </React.Fragment>
        );
      });
    } catch { /* ignore */ }
  }

  // Description truncation
  const desc = variant.description ?? '';
  const longDesc = desc.length > DESC_THRESHOLD;
  const displayDesc = longDesc && !descExpanded ? desc.slice(0, DESC_THRESHOLD) + '…' : desc;

  // From tablet up it goes under the photos, in the space the 3:2 image leaves free, so the right
  // column is price, cart, information and care. On phones the columns stack, and there it stays
  // after the cart button — under the photos it would push the price and button down.
  const descriptionBlock = (className: string) => desc && (
    <div className={`vdp-desc ${className}`}>
      <SectionTitle>{t('product.description')}</SectionTitle>
      <p className="vdp-desc-text">{displayDesc}</p>
      {longDesc && (
        <button className="vdp-read-more" onClick={() => setDescExpanded(x => !x)}>
          {descExpanded ? t('product.readLess') : t('product.readMore')}
        </button>
      )}
    </div>
  );

  return (
    <MainLayout>
      <Container className="py-4">
        <button className="btn btn-link p-0 mb-4 text-muted text-decoration-none small"
          onClick={() => navigate(-1)}>
          <FaArrowLeft className="me-1" size={12} /> {t('product.back')}
        </button>

        <Row className="g-4 g-lg-5">
          {/* ── Images ── */}
          <Col md={6}>
            {/* Main image */}
            <div
              className={`vdp-img-container${canMeasure && rulerActive ? ' vdp-img-container--ruler' : ''}`}
              ref={imgContainerRef}
              onMouseMove={e => {
                if (!lensEnabled) return;
                const r = e.currentTarget.getBoundingClientRect();
                setLensAt({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
              }}
              onMouseLeave={() => setLensAt(null)}
            >
              {currentImage
                ? <img
                    ref={imgRef}
                    src={currentImage.url}
                    alt={currentImage.altText || variant.name}
                    className={`vdp-main-img${lensEnabled ? ' vdp-main-img--lens' : ' vdp-main-img--clickable'}`}
                    style={lensEnabled && lensAt ? { transform: 'scale(2.5)', transformOrigin: `${lensAt.x}% ${lensAt.y}%` } : undefined}
                    onClick={() => setLightboxOpen(true)}
                  />
                : <span className="vdp-img-placeholder">📦</span>}

              {currentImage && (
                <IconTooltip label={t('product.openImage')} placement="left">
                  <button type="button" className="vdp-expand-btn" onClick={() => setLightboxOpen(true)} aria-label={t('product.openImage')}>
                    <FaExpand size={14} />
                  </button>
                </IconTooltip>
              )}

              {canMeasure && rulerActive && (
                <RulerOverlay containerRef={imgContainerRef} imgRef={imgRef} realWidthCm={currentImage!.realWidthCm!} />
              )}

              {images.length > 1 && (
                <>
                  <IconTooltip label={t('product.previousImage')}>
                    <button
                      className="vdp-nav-btn vdp-nav-btn--prev"
                      onClick={() => setSelectedImage(i => (i - 1 + images.length) % images.length)}
                      aria-label={t('product.previousImage')}
                    >
                      <FaChevronLeft size={13} />
                    </button>
                  </IconTooltip>
                  <IconTooltip label={t('product.nextImage')}>
                    <button
                      className="vdp-nav-btn vdp-nav-btn--next"
                      onClick={() => setSelectedImage(i => (i + 1) % images.length)}
                      aria-label={t('product.nextImage')}
                    >
                      <FaChevronRight size={13} />
                    </button>
                  </IconTooltip>

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
                  <button
                    type="button"
                    key={i}
                    className={`vdp-thumb${i === selectedImage ? ' vdp-thumb--active' : ''}`}
                    aria-pressed={i === selectedImage}
                    onClick={() => setSelectedImage(i)}
                  >
                    <img src={img.url} alt={img.altText || `${variant.name} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}

            <ImageLightbox
              images={images}
              index={selectedImage}
              show={lightboxOpen}
              title={variant.name}
              onClose={() => setLightboxOpen(false)}
              onIndexChange={setSelectedImage}
            />

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

            {descriptionBlock('vdp-desc--below-images d-none d-md-block')}
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
            <h1 className="vdp-title">{variant.name}{variant.isNew && <NewBadge className="new-badge--title" />}</h1>
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
              <span className="vdp-price">{formatPrice(variant.price)}</span>
              {(hasDiscount || hasGroupDiscount) && (
                <span className="vdp-price-original">{formatPrice(variant.originalPrice)}</span>
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
                <button className="vdp-stepper-btn" aria-label={t('cart.lessQuantity')} disabled={outOfStock || quantity <= minQty}
                  onClick={() => adj(-stepQty)}>−</button>
                <MetresInput
                  className="vdp-stepper-input"
                  aria-label={t('cart.quantityMetres')}
                  value={quantity} min={minQty}
                  disabled={outOfStock}
                  onValue={setQuantity}
                />
                <button className="vdp-stepper-btn" aria-label={t('cart.moreQuantity')} disabled={outOfStock} onClick={() => adj(stepQty)}>+</button>
              </div>
              <Button
                variant="dark" size="lg" className="flex-grow-1 fw-semibold vdp-add-btn"
                disabled={outOfStock || cartLoading}
                onClick={handleAddToCart}
              >
                <FaShoppingCart className="me-2" />
                {outOfStock ? t('product.outOfStock') : t('product.addToCart')}
              </Button>
              <div className="vdp-icon-actions">
                <FavoriteButton variantId={variant.id} size="lg" />
                <BoardButton variantId={variant.id} size="lg" />
              </div>
            </div>
            {outOfStock && (
              <div className="vdp-notify mt-2">
                <NotifyMeButton variantId={variant.id} size="lg" className="w-100" />
              </div>
            )}
            <div className="vdp-meters">{t('product.meters')}</div>

            {error && <Alert variant="danger" className="py-2 mb-3">{error}</Alert>}

            {/* Description: here only on phones — see descriptionBlock */}
            {descriptionBlock('d-md-none')}

            {/* Information */}
            {(variant.width > 0 || variant.weight > 0 || compositionText || variant.pattern || variant.fall || variant.texture) && (
              <div>
                <SectionTitle>{t('product.info')}</SectionTitle>
                {variant.width > 0 && <InfoRow label={t('product.width')} value={`${variant.width} ${t('product.widthUnit')}`} />}
                {variant.weight > 0 && <InfoRow label={t('product.weightApprox')} value={`${variant.weight} ${t('product.weightUnit')}`} />}
                {compositionText && <InfoRow label={t('product.composition')} value={compositionText} />}
                {variant.pattern && <InfoRow label={t('product.pattern')} value={t(`fabricPatterns.${variant.pattern}`)} />}
                {parseFabricColors(variant.colors).length > 0 && (
                  <InfoRow label={t('product.colors')} value={parseFabricColors(variant.colors).map(c => t(`fabricColors.${c}`)).join(', ')} />
                )}
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

        {/* "Combina con" — picked by hand in the CMS (e.g. a print's Cretona lisa colours) */}
        {goesWith.length > 0 && (
          <div className="vdp-related">
            <SectionTitle>{t('product.goesWith')}</SectionTitle>
            <Row xs={2} sm={2} md={3} lg={4} className="g-3 mt-1">
              {goesWith.map(s => (
                <Col key={s.id}><VariantCard variant={s} /></Col>
              ))}
            </Row>
          </div>
        )}

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

        {/* Recently viewed */}
        {recentlyViewed.length > 0 && (
          <div className="vdp-related">
            <SectionTitle>{t('product.recentlyViewed')}</SectionTitle>
            <Row xs={2} sm={2} md={3} lg={4} className="g-3 mt-1">
              {recentlyViewed.map(s => (
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

          {reviewsError ? (
            <Alert variant="danger" className="py-2">{reviewsError}</Alert>
          ) : reviews.length === 0 ? (
            <p className="text-muted">{t('product.noReviews')}</p>
          ) : (
            <>
              {reviews.map(r => (
                <div key={r.id} className="border-bottom py-3">
                  <div className="d-flex align-items-center gap-2">
                    <StarRating value={r.rating} size={13} />
                    <span className="fw-semibold small">{r.customerName}</span>
                    <span className="text-muted small">{formatDate(r.createdAt)}</span>
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
