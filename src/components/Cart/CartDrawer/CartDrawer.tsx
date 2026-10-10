import React, { useEffect, useState } from 'react';
import { Offcanvas, Button, Alert } from 'react-bootstrap';
import { FaTrash, FaMinus, FaPlus, FaShoppingBag, FaGift } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import IconTooltip from '../../common/IconTooltip/IconTooltip';
import { useCart } from '../../../contexts/CartContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import './CartDrawer.css';
import { formatPrice } from '../../../utils/pricing';
import { cartItemName } from '../../../utils/giftCard';

// Avoids floating-point artifacts from repeated +/- quantityStep arithmetic (e.g. 0.5 - 0.05
// would otherwise become 0.44999999999999996 in JS).
const roundToStep = (n: number) => Math.round(n * 100) / 100;

const CartDrawer: React.FC = () => {
  const { t } = useTranslation();
  const { cart, drawerOpen, closeDrawer, updateItem, removeItem, loading } = useCart();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState('');
  const [itemError, setItemError] = useState('');

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- drives the expiry countdown timer from the cart's expiresAt
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
  }, [cart?.expiresAt, t]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- clears a stale item error each time the drawer opens
  useEffect(() => { if (drawerOpen) setItemError(''); }, [drawerOpen]);

  const isEmpty = !cart?.items?.length;

  return (
    <Offcanvas show={drawerOpen} onHide={closeDrawer} placement="end" className="cart-offcanvas">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title className="fw-bold">
          <FaShoppingBag className="me-2" />
          {t('cart.title')}
        </Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body className="d-flex flex-column">
        {itemError && <Alert variant="danger" dismissible onClose={() => setItemError('')} className="py-2">{itemError}</Alert>}
        {!isEmpty && timeLeft && (
          <div className={`cart-countdown mb-3 ${timeLeft === t('cart.expired') ? 'expired' : ''}`}>
            🕐 {t('cart.reserveExpires')} <strong>{timeLeft}</strong>
          </div>
        )}

        {isEmpty ? (
          <div className="text-center text-muted my-auto">
            <FaShoppingBag size={48} className="mb-3 opacity-25" />
            <p>{t('cart.empty')}</p>
            <Button variant="primary" onClick={() => { closeDrawer(); navigate('/catalog'); }}>
              {t('cart.browseCatalog')}
            </Button>
          </div>
        ) : (
          <>
            <div className="cart-items flex-grow-1">
              {cart!.items.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-img">
                    {item.thumbnailUrl
                      ? <img src={item.thumbnailUrl} alt={item.productName} />
                      : <div className="cart-item-placeholder">{item.giftCard ? <FaGift /> : '📦'}</div>}
                  </div>
                  <div className="cart-item-info flex-grow-1">
                    <div className="cart-item-name">{cartItemName(item, t)}</div>
                    {item.isAvailable === false && <div className="small text-danger fw-semibold">{t('cart.unavailable')}</div>}
                    {item.giftCard && <div className="small text-muted">{t('giftCard.lineFor', { name: item.giftCard.recipientName })}</div>}
                    <div className="cart-item-price">
                      {item.unitPrice < item.originalUnitPrice && (
                        <span style={{ textDecoration: 'line-through', color: '#aaa', marginRight: 4, fontSize: '0.8em' }}>
                          {formatPrice(item.originalUnitPrice)}
                        </span>
                      )}
                      <span style={item.unitPrice < item.originalUnitPrice ? { color: '#dc3545', fontWeight: 600 } : {}}>
                        {formatPrice(item.unitPrice)}
                      </span>
                    </div>
                    {!item.giftCard && <div className="cart-item-qty">
                      <button className="qty-btn" aria-label={t('cart.lessQuantity')} disabled={loading || item.quantity <= item.minQuantity} onClick={() => handleUpdate(item.id, roundToStep(item.quantity - item.quantityStep))}>
                        <FaMinus size={10} />
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="qty-btn" aria-label={t('cart.moreQuantity')} disabled={loading || item.quantity + item.quantityStep > item.availableStock} onClick={() => handleUpdate(item.id, roundToStep(item.quantity + item.quantityStep))}>
                        <FaPlus size={10} />
                      </button>
                    </div>}
                  </div>
                  <div className="cart-item-subtotal">
                    <div className="fw-semibold">{formatPrice(item.subtotal)}</div>
                    <IconTooltip label={t('cart.removeItem')}>
                      <button className="remove-btn" aria-label={t('cart.removeItem')} onClick={() => handleRemove(item.id)} disabled={loading}>
                        <FaTrash size={12} />
                      </button>
                    </IconTooltip>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              {(cart!.discountPercent ?? 0) > 0 && (
                <div className="d-flex justify-content-between small text-success mb-1">
                  <span>{t('cart.discount', { percent: cart!.discountPercent })}</span>
                  <span>−{formatPrice(cart!.items.reduce((s, i) => s + (i.originalUnitPrice - i.unitPrice) * i.quantity, 0))}</span>
                </div>
              )}
              {/* The total already has the coupon off: shown, or the lines don't add up to it. */}
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
              <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                <span>{t('cart.total')}</span>
                <span>{formatPrice(cart!.total ?? 0)}</span>
              </div>
              {cart!.giftCardAmount > 0 && (
                <div className="d-flex justify-content-between small text-success mb-3" style={{ marginTop: '-0.75rem' }}>
                  <span>{t('cart.giftCardApplied', { code: cart!.giftCardCode })}</span>
                  <span>−{formatPrice(cart!.giftCardAmount)}</span>
                </div>
              )}
              <Button variant="primary" size="lg" className="w-100 mb-2" onClick={() => { closeDrawer(); navigate('/checkout'); }}
                disabled={cart!.items.some(i => i.isAvailable === false)}>
                {t('cart.checkout')}
              </Button>
              {/* react-bootstrap's Button.as prop type is too narrow for React Router's Link in this version combo */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Button variant="outline-secondary" className="w-100" as={Link as any} to="/cart" onClick={closeDrawer}>
                {t('cart.viewFull')}
              </Button>
            </div>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default CartDrawer;
