import React, { useEffect, useRef, useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { FaTruck, FaGift, FaStore, FaArrowLeft, FaPlus } from 'react-icons/fa';
import MainLayout from '../../components/Layout/MainLayout';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { checkout } from '../../services/cartService';
import { getProfile } from '../../services/profileService';
import { getShippingOptions, getPickupOptions, type ApplicableShippingRate } from '../../services/shippingService';
import { getApiErrorMessage } from '../../utils/apiError';
import type { CustomerAddress, CheckoutResponse, CheckoutRequest } from '../../types';
import PayPalCheckoutButton from './PayPalCheckoutButton';
import CartCodes from '../../components/Cart/CartCodes/CartCodes';
import AddressFormModal from '../../components/Address/AddressFormModal';
import { formatPrice } from '../../utils/pricing';
import { cartItemName } from '../../utils/giftCard';
import { loginUrl } from '../../utils/session';
import { formatMeters } from '../../utils/locale';

const CheckoutPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { siteName, companyAddress, companyPostalCode, companyCity } = useSiteSettings();
  // The tab title: this screen's, not the previous page's.
  useDocumentMeta(`${t('checkout.title')} — ${siteName}`);
  const { cart, fetchCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesError, setAddressesError] = useState('');
  const [shippingId, setShippingId] = useState<number | undefined>();
  const [billingId, setBillingId] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [paypalBusy, setPaypalBusy] = useState(false);
  const [error, setError] = useState('');
  // Options for the chosen address (null = none covers it, undefined = not looked up yet).
  const [shippingOptions, setShippingOptions] = useState<ApplicableShippingRate[] | null | undefined>(undefined);
  const [chosenRateId, setChosenRateId] = useState<number | undefined>();
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState(false);
  const [shippingRetry, setShippingRetry] = useState(0);
  const lastShippingIdRef = useRef<number | undefined>(undefined);
  // Home delivery or store pickup: chosen first, the shipping address only matters for delivery.
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [pickupOptions, setPickupOptions] = useState<ApplicableShippingRate[]>([]);
  const [chosenPickupId, setChosenPickupId] = useState<number | undefined>();
  const [pickupLoading, setPickupLoading] = useState(false);

  // New address form, right here: going to Mi cuenta for it lost the order notes typed.
  const [showAddAddress, setShowAddAddress] = useState(false);

  // Redsys redirect state
  const [redsysData, setRedsysData] = useState<CheckoutResponse | null>(null);
  const redsysFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate(loginUrl()); return; }
    fetchCart();
    getProfile().then(p => {
      setAddresses(p.addresses);
      const def = p.addresses.find(a => a.isDefault);
      if (def) { setShippingId(def.id); setBillingId(def.id); }
    }).catch(err => setAddressesError(getApiErrorMessage(err, t('checkout.loadAddressesError'))));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-off checkout bootstrap per auth state; fetchCart/navigate/t don't change what's loaded
  }, [isAuthenticated]);

  // A new address ships the order (that's why it was added); billing keeps the one chosen, or
  // takes the new one when there was none. Picking up, it can only be for the invoice.
  const handleAddressAdded = async (createdId?: number) => {
    setShowAddAddress(false);
    try {
      const p = await getProfile();
      setAddresses(p.addresses);
      if (createdId) {
        setShippingId(createdId);
        setBillingId(prev => deliveryMode === 'pickup' ? createdId : prev ?? createdId);
      }
    } catch (err) {
      // Saved, but the list didn't refresh: say so where the order is placed, keep the form usable.
      setError(getApiErrorMessage(err, t('checkout.loadAddressesError')));
    }
  };

  // Fetch the shipping options whenever the shipping address or the cart changes (the price
  // depends on the cart's weight and total, worked out server-side).
  useEffect(() => {
    if (!shippingId || !cart?.items?.length || cart.isGiftCardPurchase) {
      setShippingOptions(undefined);
      return;
    }
    let cancelled = false;
    setShippingLoading(true);
    setShippingError(false);
    const addressChanged = lastShippingIdRef.current !== shippingId;
    getShippingOptions(shippingId)
      .then(options => {
        if (cancelled) return;
        lastShippingIdRef.current = shippingId;
        setShippingOptions(options.length ? options : null);
        // Keep the customer's delivery choice while it's still offered and the address is the
        // same; else the default delivery (pickup is chosen above, never from this list).
        setChosenRateId(prev => !addressChanged && options.some(o => o.id === prev && !o.isPickup) ? prev : options.find(o => !o.isPickup)?.id);
      })
      .catch(() => { if (!cancelled) { setShippingOptions(undefined); setShippingError(true); } })
      .finally(() => { if (!cancelled) setShippingLoading(false); });
    // Switching the shipping address twice in quick succession (before the first lookup
    // resolves) must not let the slower, now-stale response overwrite the options for the
    // address actually selected now — same class of stale-response bug this codebase has hit before.
    return () => { cancelled = true; };
  }, [shippingId, cart, shippingRetry, i18n.language]); // option names come translated

  // The shop pickups need no address. A failed lookup just doesn't offer pickup: delivery works.
  useEffect(() => {
    if (!cart?.items?.length || cart.isGiftCardPurchase) { setPickupOptions([]); return; }
    let cancelled = false;
    setPickupLoading(true);
    getPickupOptions()
      .then(options => { if (!cancelled) setPickupOptions(options); })
      .catch(() => { if (!cancelled) setPickupOptions([]); })
      .finally(() => { if (!cancelled) setPickupLoading(false); });
    return () => { cancelled = true; };
  }, [cart, i18n.language]);
  // Pickup no longer offered (switched off meanwhile): back to delivery.
  useEffect(() => {
    if (deliveryMode === 'pickup' && !pickupLoading && pickupOptions.length === 0) setDeliveryMode('delivery');
  }, [deliveryMode, pickupLoading, pickupOptions]);

  const isPickup = deliveryMode === 'pickup';
  // Delivery options for the chosen address (pickup is its own choice above, not one of them).
  const deliveryOptions = shippingOptions === undefined ? undefined : (shippingOptions ?? []).filter(o => !o.isPickup);
  // The option in use: null when nothing delivers to the address.
  const shippingRate: ApplicableShippingRate | null | undefined = isPickup
    ? pickupOptions.find(o => o.id === chosenPickupId) ?? pickupOptions[0] ?? null
    : deliveryOptions === undefined ? undefined : deliveryOptions.find(o => o.id === chosenRateId) ?? null;
  const rateLoading = isPickup ? pickupLoading : shippingLoading;

  // Auto-submit the Redsys form once we have the data
  useEffect(() => {
    if (redsysData && redsysFormRef.current) {
      redsysFormRef.current.submit();
    }
  }, [redsysData]);

  // handleProceedToPayment never resets `loading` on success — it's mid-navigation to the
  // Redsys-hosted page, expecting the browser to leave. If the customer hits Back before
  // completing payment, most browsers restore this exact page (including its JS state) from the
  // back/forward cache instead of reloading, which would otherwise leave the button stuck on
  // "Procesando…" forever with no way to retry. `pageshow`'s `persisted` flag is the standard way
  // to detect that restoration and reset the stale in-flight state.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setLoading(false);
        setRedsysData(null);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const cartSubtotal = cart?.items.reduce((sum, i) => sum + i.subtotal, 0) ?? 0;
  const couponDiscount = cart?.couponDiscountAmount ?? 0;
  const estimatedShipping = shippingRate?.shippingCost ?? 0;
  const netAfterDiscount = Math.max(0, cartSubtotal - couponDiscount);
  // The cart's own recargo estimate (cart.recargoEquivalenciaAmount) is computed on
  // subtotal-coupon only, since shipping is unknown until an address is picked here — but
  // CheckoutService.InitiatePaymentAsync actually charges recargo on subtotal-coupon+shipping,
  // so using the cart's figure as-is understates this page's Total by however much recargo
  // applies to the shipping cost (grows with pricier shipping rates, not just "a few cents").
  // The frontend has no VAT rate to redo the exact base/recargo split itself, so instead of
  // omitting shipping from the estimate, scale the cart's own recargo proportionally to the
  // shipping-inclusive base — closer to the real charge without needing a new VAT-rate lookup.
  // The real, authoritative amount is always computed server-side regardless; this only affects
  // what's shown here before redirecting to Redsys.
  const recargoRatio = netAfterDiscount > 0 ? (cart?.recargoEquivalenciaAmount ?? 0) / netAfterDiscount : 0;
  const estimatedRecargo = Math.round((netAfterDiscount + estimatedShipping) * recargoRatio * 100) / 100;
  const grossTotal = netAfterDiscount + estimatedShipping + estimatedRecargo;
  // Shipped outside the VAT area (Canarias, Ceuta, Melilla, non-EU): charged without VAT and
  // without recargo. Same per-amount rounding as CheckoutService (VatTerritory.WithoutVat): each
  // line, the coupon and shipping, so this total is the amount charged.
  const vatExempt = !!shippingRate?.vatExempt; // no rate (so never exempt) for a gift card purchase
  const withoutVat = (amount: number) => Math.round(amount / (1 + (shippingRate?.vatPercent ?? 21) / 100) * 100) / 100;
  const exemptTotal = vatExempt
    ? Math.round((Math.max(0, (cart?.items ?? []).reduce((sum, i) => sum + withoutVat(i.subtotal), 0) - withoutVat(couponDiscount))
        + withoutVat(estimatedShipping)) * 100) / 100
    : 0;
  const estimatedTotal = vatExempt ? exemptTotal : grossTotal;
  const vatDeducted = vatExempt ? Math.round((netAfterDiscount + estimatedShipping - exemptTotal) * 100) / 100 : 0;
  // The gift card can also cover the shipping that's only known here: what it covers is the
  // smaller of its free balance and the whole estimate (the server recomputes it exactly).
  const giftCardCovers = cart?.giftCardCode ? Math.min(cart.giftCardAvailable, estimatedTotal) : 0;
  const amountDue = Math.round((estimatedTotal - giftCardCovers) * 100) / 100;
  const isGiftCardPurchase = cart?.isGiftCardPurchase ?? false;
  // Nothing to pay: the gift card covers it all, or a coupon brought the order to 0 €. The order is
  // placed by the button below; PayPal can't take a 0 € payment.
  const addressReady = isGiftCardPurchase || (isPickup
    ? !pickupLoading && shippingRate != null
    : !!shippingId && !shippingLoading && shippingRate != null);
  // Only once the shipping is known: while it loads, a 0 € estimate briefly said "Confirmar pedido".
  const nothingToPay = amountDue <= 0 && addressReady;
  const coveredByGiftCard = !!cart?.giftCardCode && nothingToPay;
  // Gift cards are emailed: no address (and no shipping rate) needed to buy them (addressReady).

  // Same request for both payment routes (Redsys page / PayPal button).
  const buildCheckoutRequest = (): CheckoutRequest => ({
    // A pickup ships nothing: no delivery address is sent (nor kept on the order).
    shippingAddressId: cart?.isGiftCardPurchase || isPickup ? undefined : shippingId,
    shippingRateId: cart?.isGiftCardPurchase ? undefined : shippingRate?.id,
    billingAddressId: billingId,
    notes: notes || undefined,
    browserAcceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    browserUserAgent: navigator.userAgent,
    browserJavaEnabled: false,
    browserLanguage: navigator.language,
    browserColorDepth: screen.colorDepth.toString(),
    browserScreenHeight: screen.height.toString(),
    browserScreenWidth: screen.width.toString(),
    browserTZ: new Date().getTimezoneOffset().toString(),
  });

  const handleProceedToPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await checkout(buildCheckoutRequest());
      // Paid entirely with the gift card: the order already exists, nothing to send to Redsys.
      if (res.orderId) {
        navigate('/checkout/success');
        return;
      }
      setRedsysData(res);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, t('checkout.initError')));
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;
  if (!cart?.items?.length) return (
    <MainLayout>
      <Container className="py-5 text-center">
        <p className="text-muted">{t('checkout.cartEmpty')}</p>
        <Button variant="primary" onClick={() => navigate('/catalog')}>{t('cart.browseCatalog')}</Button>
      </Container>
    </MainLayout>
  );

  return (
    <MainLayout>
      <Container className="py-4" style={{ maxWidth: 860 }}>
        {/* Quantities and lines are edited in the cart: checkout only shows them. */}
        <Button variant="link" className="d-inline-flex align-items-center gap-1 small p-0 mb-2" onClick={() => navigate('/cart')}>
          <FaArrowLeft />{t('checkout.backToCart')}
        </Button>
        <h2 className="fw-bold mb-4">{t('checkout.title')}</h2>

        {/* Hidden Redsys form — auto-submitted once redsysData is set */}
        {redsysData && (
          <form ref={redsysFormRef} method="POST" action={redsysData.redsysUrl} style={{ display: 'none' }}>
            <input type="hidden" name="Ds_SignatureVersion" value={redsysData.signatureVersion} />
            <input type="hidden" name="Ds_MerchantParameters" value={redsysData.merchantParameters} />
            <input type="hidden" name="Ds_Signature" value={redsysData.signature} />
          </form>
        )}

        <Row>
          {/* Left: address & notes form */}
          <Col lg={7} className="mb-4">
            <Card>
              <Card.Body>
                <h5 className="fw-bold mb-3">{t('checkout.shippingBilling')}</h5>

                {isGiftCardPurchase ? (
                  <Alert variant="info" className="d-flex gap-2 align-items-start">
                    <FaGift className="mt-1 flex-shrink-0" />
                    <span>{t('checkout.giftCardDelivery')}</span>
                  </Alert>
                ) : (
                  <>
                    {/* How to get it, first: the address is asked for only when it's delivered. */}
                    {pickupOptions.length > 0 && (
                      <Form.Group className="mb-3" role="radiogroup" aria-label={t('checkout.deliveryMode')}>
                        <Form.Label className="fw-semibold d-block">{t('checkout.deliveryMode')}</Form.Label>
                        <Form.Check
                          type="radio"
                          id="delivery-mode-delivery"
                          name="delivery-mode"
                          checked={!isPickup}
                          onChange={() => setDeliveryMode('delivery')}
                          label={<><FaTruck className="me-1" aria-hidden />{t('checkout.homeDelivery')}</>}
                        />
                        <Form.Check
                          type="radio"
                          id="delivery-mode-pickup"
                          name="delivery-mode"
                          checked={isPickup}
                          onChange={() => setDeliveryMode('pickup')}
                          label={<>
                            <FaStore className="me-1" aria-hidden />
                            {t('checkout.storePickup')}
                            {pickupOptions.length === 1 && <> — {pickupOptions[0].isFree || pickupOptions[0].shippingCost === 0 ? t('checkout.free') : formatPrice(pickupOptions[0].shippingCost)}</>}
                          </>}
                        />
                      </Form.Group>
                    )}

                    {addressesError && <Alert variant="danger">{addressesError}</Alert>}

                    {isPickup ? (
                      <>
                        {pickupOptions.length > 1 && (
                          <Form.Group className="mb-3" role="radiogroup" aria-label={t('checkout.storePickup')}>
                            {pickupOptions.map(o => (
                              <Form.Check
                                key={o.id}
                                type="radio"
                                id={`pickup-option-${o.id}`}
                                name="pickup-option"
                                checked={o.id === shippingRate?.id}
                                onChange={() => setChosenPickupId(o.id)}
                                label={<>{o.name} — {o.isFree || o.shippingCost === 0 ? t('checkout.free') : formatPrice(o.shippingCost)}</>}
                              />
                            ))}
                          </Form.Group>
                        )}
                        <Alert variant="info" className="py-2 small">
                          <FaStore className="me-1" aria-hidden />
                          {t('checkout.pickupAt', { address: [companyAddress, [companyPostalCode, companyCity].filter(Boolean).join(' ')].filter(Boolean).join(', ') || siteName })}
                        </Alert>
                        {/* Only for the invoice: optional, except for an invoice with the customer's NIF (the API says so). */}
                        <Form.Group className="mb-3" controlId="checkout-billing-address">
                          <Form.Label className="fw-semibold">{t('checkout.billingAddress')}</Form.Label>
                          {addresses.length > 0 && (
                            <Form.Select value={billingId ?? ''} onChange={e => setBillingId(e.target.value ? Number(e.target.value) : undefined)}>
                              <option value="">{t('checkout.noBillingAddress')}</option>
                              {addresses.map(a => (
                                <option key={a.id} value={a.id}>{a.alias} — {a.street}, {a.city}</option>
                              ))}
                            </Form.Select>
                          )}
                          <Button variant="link" size="sm" className="p-0 mt-1 d-inline-flex align-items-center gap-1" onClick={() => setShowAddAddress(true)}>
                            <FaPlus aria-hidden />{addresses.length > 0 ? t('checkout.addOtherAddress') : t('checkout.addAddress')}
                          </Button>
                        </Form.Group>
                      </>
                    ) : addresses.length === 0 && !addressesError ? (
                      <Alert variant="info">
                        {t('checkout.noAddresses')}{' '}
                        {/* The new-address form opens here (it used to send the first-time buyer to Mi cuenta). */}
                        <Button variant="link" className="p-0" onClick={() => setShowAddAddress(true)}>{t('checkout.addAddress')}</Button>
                      </Alert>
                    ) : addresses.length > 0 && (
                      <>
                        <Form.Group className="mb-3" controlId="checkout-shipping-address">
                          <Form.Label className="fw-semibold">{t('checkout.shippingAddress')}</Form.Label>
                          <Form.Select value={shippingId ?? ''} onChange={e => setShippingId(e.target.value ? Number(e.target.value) : undefined)}>
                            <option value="">{t('checkout.selectAddress')}</option>
                            {addresses.map(a => (
                              <option key={a.id} value={a.id}>{a.alias} — {a.street}, {a.city}</option>
                            ))}
                          </Form.Select>
                          <Button variant="link" size="sm" className="p-0 mt-1 d-inline-flex align-items-center gap-1" onClick={() => setShowAddAddress(true)}>
                            <FaPlus aria-hidden />{t('checkout.addOtherAddress')}
                          </Button>
                        </Form.Group>

                        {shippingError && (
                          <Alert variant="danger" className="py-2 small d-flex align-items-center justify-content-between gap-2">
                            <span>{t('checkout.shippingLoadError')}</span>
                            <Button size="sm" variant="outline-danger" onClick={() => setShippingRetry(n => n + 1)}>{t('checkout.shippingRetry')}</Button>
                          </Alert>
                        )}
                        {deliveryOptions && deliveryOptions.length > 1 && (
                          <Form.Group className="mb-3" role="radiogroup" aria-label={t('checkout.shippingMethod')}>
                            <Form.Label className="fw-semibold d-block">{t('checkout.shippingMethod')}</Form.Label>
                            {deliveryOptions.map(o => (
                              <Form.Check
                                key={o.id}
                                type="radio"
                                id={`shipping-option-${o.id}`}
                                name="shipping-option"
                                checked={o.id === chosenRateId}
                                onChange={() => setChosenRateId(o.id)}
                                label={<>
                                  <FaTruck className="me-1" aria-hidden />
                                  {o.name} — {o.isFree || o.shippingCost === 0 ? t('checkout.free') : formatPrice(o.shippingCost)}
                                </>}
                              />
                            ))}
                          </Form.Group>
                        )}

                        <Form.Group className="mb-3" controlId="checkout-billing-address">
                          <Form.Label className="fw-semibold">{t('checkout.billingAddress')}</Form.Label>
                          <Form.Select value={billingId ?? ''} onChange={e => setBillingId(e.target.value ? Number(e.target.value) : undefined)}>
                            <option value="">{t('checkout.sameBilling')}</option>
                            {addresses.map(a => (
                              <option key={a.id} value={a.id}>{a.alias} — {a.street}, {a.city}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </>
                    )}
                  </>
                )}

                <Form.Group className="mb-3" controlId="checkout-notes">
                  <Form.Label className="fw-semibold">{t('checkout.orderNotes')}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={t('checkout.notesPlaceholder')}
                  />
                </Form.Group>

                {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                <Button
                  variant="primary"
                  size="lg"
                  className="w-100"
                  onClick={handleProceedToPayment}
                  disabled={loading || paypalBusy || !addressReady}
                >
                  {loading
                    ? <><Spinner size="sm" animation="border" className="me-2" />{t('checkout.processing')}</>
                    : coveredByGiftCard ? t('checkout.confirmWithGiftCard') : nothingToPay ? t('checkout.confirmFree') : t('checkout.proceed')}
                </Button>
                {coveredByGiftCard && <div className="small text-success mt-2">{t('checkout.coveredByGiftCard')}</div>}
                {nothingToPay && !coveredByGiftCard && <div className="small text-success mt-2">{t('checkout.nothingToPay')}</div>}

                {!nothingToPay && (
                  <PayPalCheckoutButton
                    buildRequest={buildCheckoutRequest}
                    disabled={loading || !addressReady}
                    onPaid={() => navigate('/checkout/success')}
                    onError={message => setError(message)}
                    onBusyChange={setPaypalBusy}
                  />
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Right: order summary */}
          <Col lg={5}>
            {/* sticky-top brings z-index 1020, above the header (1000): the open mega menu went under the summary. */}
            <Card className="sticky-top" style={{ top: 90, zIndex: 1 }}>
              <Card.Body>
                <h5 className="fw-bold mb-3">{t('checkout.orderSummary')}</h5>
                {cart.items.map(item => (
                  <div key={item.id} className="d-flex justify-content-between small mb-1">
                    <span className="text-muted">{item.giftCard ? `${cartItemName(item, t)} · ${t('giftCard.lineFor', { name: item.giftCard.recipientName })}` : `${item.productName} × ${formatMeters(item.quantity)}`}</span>
                    <span>{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
                <hr className="my-2" />

                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-muted">{t('checkout.subtotal')}</span>
                  <span>{formatPrice(cartSubtotal)}</span>
                </div>
                {cart.couponCode && (
                  <div className="d-flex justify-content-between small text-success mb-1">
                    <span>{t('cart.couponDiscount', { code: cart.couponCode })}</span>
                    <span>−{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                {!isGiftCardPurchase && <div className="d-flex justify-content-between small mb-2">
                  <span className="text-muted">{t('checkout.shipping')}</span>
                  <span>
                    {rateLoading ? (
                      <Spinner size="sm" animation="border" />
                    ) : shippingRate == null ? (
                      !isPickup && shippingId && shippingRate === null
                        ? <Badge bg="warning" text="dark">{t('checkout.notAvailable')}</Badge>
                        : <span className="text-muted">—</span>
                    ) : shippingRate.isFree ? (
                      <span className="text-success fw-semibold">{t('checkout.free')}</span>
                    ) : (
                      formatPrice(shippingRate.shippingCost)
                    )}
                  </span>
                </div>}

                {shippingRate && shippingRate.freeShippingThreshold && !shippingRate.isFree && (
                  <div className="small text-muted mb-2">
                    {t('checkout.freeShippingFrom', { threshold: formatPrice(shippingRate.freeShippingThreshold) })}{' '}
                    {/* Shipped without VAT, the threshold counts what's paid: the subtotal without VAT. */}
                    {t('checkout.missingForFree', { missing: formatPrice(shippingRate.freeShippingThreshold - (vatExempt ? withoutVat(cartSubtotal) : cartSubtotal)) })}
                  </div>
                )}
                {!isPickup && shippingRate === null && shippingId && (
                  <Alert variant="warning" className="py-2 small">
                    {pickupOptions.length > 0 ? t('checkout.noShippingRatePickup') : t('checkout.noShippingRate')}
                  </Alert>
                )}

                {vatExempt && (
                  <div className="d-flex justify-content-between small text-success mb-2">
                    <span>{t('checkout.vatExempt')}</span>
                    <span>−{formatPrice(vatDeducted)}</span>
                  </div>
                )}

                {estimatedRecargo > 0 && !vatExempt && (
                  <div className="d-flex justify-content-between small text-muted mb-2">
                    <span>{t('cart.recargoEquivalencia', { percent: cart?.recargoEquivalenciaPercent ?? 0 })}</span>
                    <span>{formatPrice(estimatedRecargo)}</span>
                  </div>
                )}

                {/* A code not entered in the cart can still go in here (only while none is applied:
                    the applied one shows with its «Quitar»). */}
                <hr className="my-2" />
                <CartCodes />
                <div className="d-flex justify-content-between fw-bold fs-5">
                  <span>{t('checkout.total')}</span>
                  <span>{formatPrice(estimatedTotal)}</span>
                </div>
                {giftCardCovers > 0 && (
                  <>
                    <div className="d-flex justify-content-between small text-success mt-1">
                      <span><FaGift className="me-1" />{t('cart.giftCardApplied', { code: cart.giftCardCode })}</span>
                      <span>−{formatPrice(giftCardCovers)}</span>
                    </div>
                    <div className="d-flex justify-content-between fw-bold mt-1">
                      <span>{t('cart.amountDue')}</span>
                      <span>{formatPrice(amountDue)}</span>
                    </div>
                  </>
                )}

                {shippingRate && (
                  <div className="small text-muted mt-1">{shippingRate.name}</div>
                )}
                {shippingRate && (shippingRate.estimatedDaysMin != null || shippingRate.estimatedDaysMax != null) && (
                  <div className="small text-success mt-1">
                    <FaTruck className="me-1" />
                    {shippingRate.estimatedDaysMin != null && shippingRate.estimatedDaysMax != null && shippingRate.estimatedDaysMin !== shippingRate.estimatedDaysMax
                      ? t('checkout.estimatedDeliveryRange', { min: shippingRate.estimatedDaysMin, max: shippingRate.estimatedDaysMax })
                      : t('checkout.estimatedDeliveryExact', { days: shippingRate.estimatedDaysMin ?? shippingRate.estimatedDaysMax })}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <AddressFormModal show={showAddAddress} onHide={() => setShowAddAddress(false)} onSaved={handleAddressAdded} />
    </MainLayout>
  );
};

export default CheckoutPage;
