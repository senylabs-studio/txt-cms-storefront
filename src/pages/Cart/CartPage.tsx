import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Card, Alert, Form } from 'react-bootstrap';
import { FaTrash, FaArrowRight, FaTag, FaGift } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import IconTooltip from '../../components/common/IconTooltip/IconTooltip';
import MainLayout from '../../components/Layout/MainLayout';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatPrice } from '../../utils/pricing';
import { cartItemName } from '../../utils/giftCard';
import GiftCardEditModal from '../../components/Cart/GiftCardEditModal/GiftCardEditModal';
import type { CartItem } from '../../types';

const CartPage: React.FC = () => {
  const { t } = useTranslation();
  const { siteName } = useSiteSettings();
  // The tab title: this screen's, not the previous page's.
  useDocumentMeta(`${t('cart.title')} — ${siteName}`);
  const { cart, loading, fetchCart, updateItem, removeItem, applyCoupon, removeCoupon, applyGiftCard, removeGiftCard } = useCart();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState('');
  const [itemError, setItemError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [giftCardInput, setGiftCardInput] = useState('');
  const [giftCardError, setGiftCardError] = useState('');
  const [giftCardLoading, setGiftCardLoading] = useState(false);
  const [editingGiftCard, setEditingGiftCard] = useState<CartItem | null>(null);

  const handleApplyGiftCard = async () => {
    if (!giftCardInput.trim()) return;
    setGiftCardError('');
    setGiftCardLoading(true);
    try {
      await applyGiftCard(giftCardInput.trim());
      setGiftCardInput('');
      showToast('success', t('cart.giftCardApplySuccess'));
    } catch (e) {
      setGiftCardError(getApiErrorMessage(e, t('cart.giftCardApplyError')));
    } finally {
      setGiftCardLoading(false);
    }
  };

  const handleRemoveGiftCard = async () => {
    setGiftCardError('');
    try { await removeGiftCard(); }
    catch (e) { setGiftCardError(getApiErrorMessage(e, t('cart.giftCardApplyError'))); }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      await applyCoupon(couponInput.trim());
      setCouponInput('');
      showToast('success', t('cart.couponApplySuccess'));
    } catch (e) {
      setCouponError(getApiErrorMessage(e, t('cart.couponApplyError')));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponError('');
    try { await removeCoupon(); }
    catch (e) { setCouponError(getApiErrorMessage(e, t('cart.couponApplyError'))); }
  };

  const handleUpdate = async (itemId: number, quantity: number) => {
    setItemError('');
    try {
      await updateItem(itemId, quantity);
    } catch (e) {
      setItemError(getApiErrorMessage(e, t('cart.updateError')));
    }
  };

  const handleRemove = async (itemId: number) => {
    setItemError('');
    try {
      await removeItem(itemId);
    } catch (e) {
      setItemError(getApiErrorMessage(e, t('cart.removeError')));
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchCart is redefined by the provider; refetch only when auth state changes
  useEffect(() => { if (isAuthenticated) fetchCart(); }, [isAuthenticated]);

  useEffect(() => {
    if (!cart?.expiresAt) { setTimeLeft(''); return; }
    const tick = () => {
      const diff = new Date(cart.expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(t('cart.expired')); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t only formats the countdown text; restarting the timer on every render isn't wanted
  }, [cart?.expiresAt]);

  if (!isAuthenticated) return (
    <MainLayout>
      <Container className="py-5 text-center">
        <h4>{t('cart.loginRequired')}</h4>
        <Button variant="primary" onClick={() => navigate('/login')}>{t('header.login')}</Button>
      </Container>
    </MainLayout>
  );

  const isEmpty = !cart?.items?.length;

  return (
    <MainLayout>
      <Container className="py-4">
        <h2 className="fw-bold mb-4">{t('cart.title')}</h2>

        {isEmpty ? (
          <div className="text-center py-5">
            <p className="text-muted mb-3">{t('cart.empty')}</p>
            <Button variant="primary" onClick={() => navigate('/catalog')}>{t('cart.browseCatalog')}</Button>
          </div>
        ) : (
          <Row>
            <Col lg={8}>
              {itemError && <Alert variant="danger" dismissible onClose={() => setItemError('')}>{itemError}</Alert>}
              {timeLeft && (
                <Alert variant={timeLeft === t('cart.expired') ? 'danger' : 'warning'} className="d-flex align-items-center gap-2">
                  🕐 {t('cart.reserveExpires')} <strong>{timeLeft}</strong>
                  {timeLeft === t('cart.expired') && <Button size="sm" variant="outline-danger" onClick={fetchCart} className="ms-auto">{t('cart.refresh')}</Button>}
                </Alert>
              )}

              {cart!.items.map(item => (
                <Card key={item.id} className="mb-3">
                  <Card.Body>
                    <Row className="align-items-center">
                      <Col xs={3} sm={2}>
                        {item.thumbnailUrl
                          ? <img src={item.thumbnailUrl} alt={item.productName} className="w-100 rounded" style={{ aspectRatio: '3 / 2', objectFit: 'cover' }} />
                          : <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ aspectRatio: '1', fontSize: 24 }}>{item.giftCard ? <FaGift className="text-primary" /> : '📦'}</div>}
                      </Col>
                      {item.giftCard ? (
                        <Col xs={9} sm={8}>
                          <div className="fw-semibold">{cartItemName(item, t)}</div>
                          <div className="text-muted small">{t('giftCard.lineFor', { name: item.giftCard.recipientName })}</div>
                          {item.giftCard.message && <div className="small fst-italic text-truncate">“{item.giftCard.message}”</div>}
                          <Button size="sm" variant="link" className="p-0 small" onClick={() => setEditingGiftCard(item)} disabled={loading}>
                            {t('giftCard.edit')}
                          </Button>
                        </Col>
                      ) : (
                        <>
                      <Col xs={9} sm={5}>
                        <div className="fw-semibold">{item.productName}</div>
                        <div className="text-muted small">{item.productCode}</div>
                        <div className="small">
                          {item.unitPrice < item.originalUnitPrice && (
                            <span className="text-muted text-decoration-line-through me-1">
                              {formatPrice(item.originalUnitPrice)}
                            </span>
                          )}
                          <span className={item.unitPrice < item.originalUnitPrice ? 'sf-price' : 'text-muted'}>
                            {formatPrice(item.unitPrice)} / m
                          </span>
                        </div>
                      </Col>
                      <Col sm={3} className="d-flex align-items-center mt-2 mt-sm-0">
                        <Form.Control
                          type="number"
                          min={item.minQuantity}
                          step={item.quantityStep}
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v >= item.minQuantity) handleUpdate(item.id, v);
                          }}
                          style={{ width: 90 }}
                          disabled={loading}
                        />
                      </Col>
                        </>
                      )}
                      <Col sm={2} className="text-end mt-2 mt-sm-0">
                        <div className="fw-bold">{formatPrice(item.subtotal)}</div>
                        <IconTooltip label={t('cart.removeItem')}>
                          <Button size="sm" variant="link" className="text-danger p-0" aria-label={t('cart.removeItem')} onClick={() => handleRemove(item.id)} disabled={loading}>
                            <FaTrash size={12} />
                          </Button>
                        </IconTooltip>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}
            </Col>

            <Col lg={4}>
              <Card className="sticky-top" style={{ top: 90 }}>
                <Card.Body>
                  <h5 className="fw-bold mb-3">{t('cart.summary')}</h5>
                  {cart!.items.map(item => (
                    <div key={item.id} className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">{item.giftCard ? cartItemName(item, t) : `${item.productName} x${item.quantity}m`}</span>
                      <span>{formatPrice(item.subtotal)}</span>
                    </div>
                  ))}
                  {(cart!.discountPercent ?? 0) > 0 && (
                    <div className="d-flex justify-content-between small text-success mb-1">
                      <span>{t('cart.discount', { percent: cart!.discountPercent })}</span>
                      <span>−{formatPrice(cart!.items.reduce((s, i) => s + (i.originalUnitPrice - i.unitPrice) * i.quantity, 0))}</span>
                    </div>
                  )}
                  {cart!.couponCode && (
                    <div className="d-flex justify-content-between small text-success mb-1">
                      <span>{t('cart.couponDiscount', { code: cart!.couponCode })}</span>
                      <span>−{formatPrice(cart!.couponDiscountAmount)}</span>
                    </div>
                  )}
                  {cart!.recargoEquivalenciaAmount > 0 && (
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>{t('cart.recargoEquivalencia', { percent: cart!.recargoEquivalenciaPercent })}</span>
                      <span>{formatPrice(cart!.recargoEquivalenciaAmount)}</span>
                    </div>
                  )}
                  <hr />

                  {cart!.couponError && (
                    <Alert variant="warning" className="py-2 small mb-2">{cart!.couponError}</Alert>
                  )}
                  {cart!.isGiftCardPurchase ? null : cart!.couponCode ? (
                    <div className="d-flex justify-content-between align-items-center small mb-3">
                      <span><FaTag className="me-1" />{cart!.couponCode}</span>
                      <Button size="sm" variant="link" className="text-danger p-0" onClick={handleRemoveCoupon} disabled={loading}>
                        {t('cart.removeCoupon')}
                      </Button>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="d-flex gap-2">
                        <Form.Control
                          type="text"
                          size="sm"
                          placeholder={t('cart.couponPlaceholder')}
                          value={couponInput}
                          onChange={e => setCouponInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                          disabled={couponLoading}
                        />
                        <Button size="sm" variant="outline-primary" onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()}>
                          {t('cart.applyCoupon')}
                        </Button>
                      </div>
                      {couponError && <div className="text-danger small mt-1">{couponError}</div>}
                    </div>
                  )}
                  {!cart!.isGiftCardPurchase && (
                    <div className="mb-3">
                      {cart!.giftCardError && <Alert variant="warning" className="py-2 small mb-2">{cart!.giftCardError}</Alert>}
                      {cart!.giftCardCode ? (
                        <div className="d-flex justify-content-between align-items-center small">
                          <span><FaGift className="me-1" />{t('cart.giftCardApplied', { code: cart!.giftCardCode })}</span>
                          <Button size="sm" variant="link" className="text-danger p-0" onClick={handleRemoveGiftCard} disabled={loading}>
                            {t('cart.giftCardRemove')}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="small fw-semibold mb-1"><FaGift className="me-1" />{t('cart.giftCardTitle')}</div>
                          <div className="d-flex gap-2">
                            <Form.Control
                              type="text"
                              size="sm"
                              placeholder={t('cart.giftCardPlaceholder')}
                              aria-label={t('cart.giftCardPlaceholder')}
                              value={giftCardInput}
                              onChange={e => setGiftCardInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyGiftCard(); } }}
                              disabled={giftCardLoading}
                            />
                            <Button size="sm" variant="outline-primary" onClick={handleApplyGiftCard} disabled={giftCardLoading || !giftCardInput.trim()}>
                              {t('cart.giftCardApply')}
                            </Button>
                          </div>
                          {giftCardError && <div className="text-danger small mt-1">{giftCardError}</div>}
                        </>
                      )}
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold fs-5 mb-1">
                    <span>{t('cart.total')}</span>
                    <span>{formatPrice(cart!.total ?? 0)}</span>
                  </div>
                  {cart!.giftCardAmount > 0 && (
                    <>
                      <div className="d-flex justify-content-between small text-success mb-1">
                        <span>{t('cart.giftCardApplied', { code: cart!.giftCardCode })}</span>
                        <span>−{formatPrice(cart!.giftCardAmount)}</span>
                      </div>
                      <div className="d-flex justify-content-between fw-bold mb-1">
                        <span>{t('cart.amountDue')}</span>
                        <span>{formatPrice(cart!.amountDue)}</span>
                      </div>
                    </>
                  )}
                  <div className="mb-3" />
                  <Button variant="primary" size="lg" className="w-100" onClick={() => navigate('/checkout')}>
                    {t('cart.checkout')} <FaArrowRight className="ms-1" />
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
      <GiftCardEditModal
        item={editingGiftCard}
        onClose={() => setEditingGiftCard(null)}
        onSaved={() => { setEditingGiftCard(null); showToast('success', t('giftCard.editSuccess')); }}
      />
    </MainLayout>
  );
};

export default CartPage;
