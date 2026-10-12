import React, { useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { FaTag, FaGift } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../../contexts/CartContext';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

/** Discount coupon + gift card: the code fields, or the applied code with its «Quitar». Shared by
 *  the cart and the checkout summary, so a customer who reaches checkout without entering a code
 *  can still use one there (the summary recalculates from the cart). */
const CartCodes: React.FC = () => {
  const { t } = useTranslation();
  const { cart, loading, applyCoupon, removeCoupon, applyGiftCard, removeGiftCard } = useCart();
  const { showToast } = useToast();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [giftCardInput, setGiftCardInput] = useState('');
  const [giftCardError, setGiftCardError] = useState('');
  const [giftCardLoading, setGiftCardLoading] = useState(false);

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

  if (!cart) return null;
  return (
    <>
      {cart.couponError && (
        <Alert variant="warning" className="py-2 small mb-2">{cart.couponError}</Alert>
      )}
      {cart.isGiftCardPurchase ? null : cart.couponCode ? (
        <div className="d-flex justify-content-between align-items-center small mb-3">
          <span><FaTag className="me-1" />{cart.couponCode}</span>
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
      {!cart.isGiftCardPurchase && (
        <div className="mb-3">
          {cart.giftCardError && <Alert variant="warning" className="py-2 small mb-2">{cart.giftCardError}</Alert>}
          {cart.giftCardCode ? (
            <div className="d-flex justify-content-between align-items-center small">
              <span><FaGift className="me-1" />{t('cart.giftCardApplied', { code: cart.giftCardCode })}</span>
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
    </>
  );
};

export default CartCodes;
