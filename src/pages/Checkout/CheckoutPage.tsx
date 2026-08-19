import React, { useEffect, useRef, useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { checkout } from '../../services/cartService';
import { getProfile } from '../../services/profileService';
import { getApplicableShippingRate, type ApplicableShippingRate } from '../../services/shippingService';
import type { CustomerAddress, CheckoutResponse } from '../../types';

const CheckoutPage: React.FC = () => {
  const { t } = useTranslation();
  const { cart, fetchCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [shippingId, setShippingId] = useState<number | undefined>();
  const [billingId, setBillingId] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingRate, setShippingRate] = useState<ApplicableShippingRate | null | undefined>(undefined);
  const [shippingLoading, setShippingLoading] = useState(false);

  // Redsys redirect state
  const [redsysData, setRedsysData] = useState<CheckoutResponse | null>(null);
  const redsysFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchCart();
    getProfile().then(p => {
      setAddresses(p.addresses);
      const def = p.addresses.find(a => a.isDefault);
      if (def) { setShippingId(def.id); setBillingId(def.id); }
    }).catch(() => {});
  }, [isAuthenticated]);

  // Fetch shipping rate whenever shipping address or cart changes
  useEffect(() => {
    if (!shippingId || !cart?.items?.length) {
      setShippingRate(undefined);
      return;
    }
    const addr = addresses.find(a => a.id === shippingId);
    if (!addr?.country) { setShippingRate(undefined); return; }

    const cartSubtotal = cart.items.reduce((sum, i) => sum + i.subtotal, 0);
    setShippingLoading(true);
    getApplicableShippingRate(addr.country, cartSubtotal).then(rate => {
      setShippingRate(rate);
    }).finally(() => setShippingLoading(false));
  }, [shippingId, addresses, cart]);

  // Auto-submit the Redsys form once we have the data
  useEffect(() => {
    if (redsysData && redsysFormRef.current) {
      redsysFormRef.current.submit();
    }
  }, [redsysData]);

  const cartSubtotal = cart?.items.reduce((sum, i) => sum + i.subtotal, 0) ?? 0;
  const couponDiscount = cart?.couponDiscountAmount ?? 0;
  const estimatedShipping = shippingRate?.shippingCost ?? 0;
  const estimatedTotal = Math.max(0, cartSubtotal - couponDiscount) + estimatedShipping;

  const handleProceedToPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await checkout({
        shippingAddressId: shippingId,
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
      setRedsysData(res);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? t('checkout.initError'));
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

                {addresses.length === 0 ? (
                  <Alert variant="info">
                    {t('checkout.noAddresses')}{' '}
                    <Button variant="link" className="p-0" onClick={() => navigate('/account')}>{t('checkout.addAddress')}</Button>
                  </Alert>
                ) : (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">{t('checkout.shippingAddress')}</Form.Label>
                      <Form.Select value={shippingId ?? ''} onChange={e => setShippingId(Number(e.target.value))}>
                        <option value="">{t('checkout.selectAddress')}</option>
                        {addresses.map(a => (
                          <option key={a.id} value={a.id}>{a.alias} — {a.street}, {a.city}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">{t('checkout.billingAddress')}</Form.Label>
                      <Form.Select value={billingId ?? ''} onChange={e => setBillingId(Number(e.target.value))}>
                        <option value="">{t('checkout.sameBilling')}</option>
                        {addresses.map(a => (
                          <option key={a.id} value={a.id}>{a.alias} — {a.street}, {a.city}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </>
                )}

                <Form.Group className="mb-3">
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
                  disabled={loading || !shippingId}
                >
                  {loading
                    ? <><Spinner size="sm" animation="border" className="me-2" />{t('checkout.processing')}</>
                    : t('checkout.proceed')}
                </Button>
              </Card.Body>
            </Card>
          </Col>

          {/* Right: order summary */}
          <Col lg={5}>
            <Card className="sticky-top" style={{ top: 90 }}>
              <Card.Body>
                <h5 className="fw-bold mb-3">{t('checkout.orderSummary')}</h5>
                {cart.items.map(item => (
                  <div key={item.id} className="d-flex justify-content-between small mb-1">
                    <span className="text-muted">{item.productName} x{item.quantity}m</span>
                    <span>€{item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
                <hr className="my-2" />

                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-muted">{t('checkout.subtotal')}</span>
                  <span>€{cartSubtotal.toFixed(2)}</span>
                </div>
                {cart.couponCode && (
                  <div className="d-flex justify-content-between small text-success mb-1">
                    <span>{t('cart.couponDiscount', { code: cart.couponCode })}</span>
                    <span>−€{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between small mb-2">
                  <span className="text-muted">{t('checkout.shipping')}</span>
                  <span>
                    {shippingLoading ? (
                      <Spinner size="sm" animation="border" />
                    ) : shippingRate == null ? (
                      shippingId && shippingRate === null
                        ? <Badge bg="warning" text="dark">{t('checkout.notAvailable')}</Badge>
                        : <span className="text-muted">—</span>
                    ) : shippingRate.isFree ? (
                      <span className="text-success fw-semibold">{t('checkout.free')}</span>
                    ) : (
                      `€${shippingRate.shippingCost.toFixed(2)}`
                    )}
                  </span>
                </div>

                {shippingRate && shippingRate.freeShippingThreshold && !shippingRate.isFree && (
                  <div className="small text-muted mb-2">
                    {t('checkout.freeShippingFrom', { threshold: shippingRate.freeShippingThreshold.toFixed(2) })}{' '}
                    {t('checkout.missingForFree', { missing: (shippingRate.freeShippingThreshold - cartSubtotal).toFixed(2) })}
                  </div>
                )}
                {shippingRate === null && shippingId && (
                  <Alert variant="warning" className="py-2 small">
                    {t('checkout.noShippingRate')}
                  </Alert>
                )}

                <hr className="my-2" />
                <div className="d-flex justify-content-between fw-bold fs-5">
                  <span>{t('checkout.total')}</span>
                  <span>€{estimatedTotal.toFixed(2)}</span>
                </div>

                {shippingRate && (
                  <div className="small text-muted mt-1">{shippingRate.name}</div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </MainLayout>
  );
};

export default CheckoutPage;
