import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, Alert, Form } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaFileDownload, FaBan, FaUndo, FaStar, FaGift } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { getOrderDetail, downloadOrderInvoice, cancelOrder, requestReturn } from '../../services/profileService';
import type { StorefrontOrderDetail } from '../../types';
import { ORDER_STATUS_VARIANT } from '../../utils/orderStatus';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import PageLoader from '../../components/common/ScissorsLoader/PageLoader';
import { formatPrice } from '../../utils/pricing';
import { downloadGiftCardLetter } from '../../services/giftCardService';
import { formatDate, countryName } from '../../utils/locale';

const OrderDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [order, setOrder] = useState<StorefrontOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [requestingReturn, setRequestingReturn] = useState(false);
  const [returnError, setReturnError] = useState('');
  const [downloadingLetterId, setDownloadingLetterId] = useState<number | null>(null);

  const loadOrder = () => {
    if (!id) return;
    return getOrderDetail(Number(id))
      .then(setOrder)
      .catch(() => navigate('/account/orders'));
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getOrderDetail(Number(id))
      .then(o => { if (!cancelled) setOrder(o); })
      .catch(() => { if (!cancelled) navigate('/account/orders'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // Cancel/return/invoice-download all act on `order.id` from state, not the route `id` — the
    // account orders list links between different orders on the same /account/orders/:id route,
    // so navigating there again doesn't unmount this component. Without this guard, an older
    // order's slower response resolving after a newer one's would silently leave `order` (and
    // therefore every action button) pointing at the WRONG order while the URL showed the new one.
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <MainLayout><PageLoader /></MainLayout>;
  if (!order) return null;

  // Gift card purchases carry no invoice (the order where the balance is spent is invoiced).
  // A cancelled order keeps the invoice issued before it was cancelled (with its rectificativa).
  const canDownloadInvoice = order.status !== 'PendingPayment' && !order.isGiftCardPurchase
    && (order.status !== 'Cancelled' || !!order.hasInvoice);
  const canCancelOrder = order.status === 'PendingPayment' || order.status === 'Paid';
  const canRequestReturn = order.status === 'Delivered' && !order.returnRequestedAt;
  const canReview = order.status === 'Delivered';

  const handleDownloadLetter = async (giftCardId: number, code: string) => {
    setDownloadingLetterId(giftCardId);
    try { await downloadGiftCardLetter(giftCardId, code); }
    catch (err) { showToast('danger', getApiErrorMessage(err, t('orderDetail.letterError'))); }
    finally { setDownloadingLetterId(null); }
  };

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true);
    try { await downloadOrderInvoice(order.id); }
    catch (err) { showToast('danger', getApiErrorMessage(err, t('orderDetail.downloadError'))); }
    finally { setDownloadingInvoice(false); }
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await cancelOrder(order.id, cancelReason.trim() || undefined);
      await loadOrder();
      setShowCancelConfirm(false);
      setCancelReason('');
      showToast('success', t('orderDetail.cancelSuccess'));
    } catch (err) {
      setCancelError(getApiErrorMessage(err, t('orderDetail.cancelError')));
    } finally {
      setCancelling(false);
    }
  };

  const handleRequestReturn = async () => {
    setRequestingReturn(true);
    setReturnError('');
    try {
      await requestReturn(order.id, returnReason.trim() || undefined);
      await loadOrder();
      setShowReturnModal(false);
      setReturnReason('');
      showToast('success', t('orderDetail.returnSuccess'));
    } catch (err) {
      setReturnError(getApiErrorMessage(err, t('orderDetail.returnError')));
    } finally {
      setRequestingReturn(false);
    }
  };

  return (
    <MainLayout>
      <Container className="py-4">
        <Button variant="link" className="p-0 text-muted mb-3" onClick={() => navigate('/account/orders')}>
          <FaArrowLeft className="me-1" /> {t('orderDetail.backToOrders')}
        </Button>

        <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
          <h2 className="fw-bold mb-0">{t('orderDetail.order', { id: order.id })}</h2>
          <Badge bg={ORDER_STATUS_VARIANT[order.status] ?? 'secondary'} className="fs-6">
            {t(`orders.statuses.${order.status}`, { defaultValue: order.status })}
          </Badge>
          <div className="ms-auto d-flex gap-2">
            {canCancelOrder && (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setShowCancelConfirm(true)}
              >
                <FaBan className="me-2" />
                {t('orderDetail.cancelOrder')}
              </Button>
            )}
            {canRequestReturn && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowReturnModal(true)}
              >
                <FaUndo className="me-2" />
                {t('orderDetail.requestReturn')}
              </Button>
            )}
            {canDownloadInvoice && (
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={downloadingInvoice}
                onClick={handleDownloadInvoice}
              >
                <FaFileDownload className="me-2" />
                {t('orderDetail.downloadInvoice')}
              </Button>
            )}
          </div>
        </div>

        {order.returnRequestedAt && (
          <Alert variant="info">{t('orderDetail.returnRequested', { date: formatDate(order.returnRequestedAt) })}</Alert>
        )}

        <Row className="mb-4">
          <Col md={6} className="mb-3">
            <Card className="h-100">
              <Card.Body>
                <h6 className="fw-semibold mb-2">{t('orderDetail.info')}</h6>
                <div className="text-muted small">{t('orderDetail.date')} {formatDate(order.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                {order.trackingNumber && (
                  <div className="text-muted small mt-1">
                    {t('orderDetail.trackingNumber')}{' '}
                    {order.trackingUrl && /^https?:\/\//i.test(order.trackingUrl) ? (
                      <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
                        {order.trackingNumber}{order.carrier ? ` (${order.carrier})` : ''}
                      </a>
                    ) : (
                      <>{order.trackingNumber}{order.carrier ? ` (${order.carrier})` : ''}</>
                    )}
                  </div>
                )}
                {order.notes && <div className="text-muted small mt-1">{t('orderDetail.notes')} {order.notes}</div>}
              </Card.Body>
            </Card>
          </Col>
          {order.shippingAddress && (
            <Col md={6} className="mb-3">
              <Card className="h-100">
                <Card.Body>
                  <h6 className="fw-semibold mb-2">{t('orderDetail.shippingAddress')}</h6>
                  <div className="text-muted small">
                    <div>{order.shippingAddress.recipientName}</div>
                    <div>{order.shippingAddress.street}</div>
                    <div>{order.shippingAddress.postalCode} {order.shippingAddress.city}</div>
                    <div>{countryName(order.shippingAddress.country)}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>

        <Card>
          <Card.Body>
            <h6 className="fw-semibold mb-3">{t('orderDetail.products')}</h6>
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 52 }}></th>
                  <th>{t('orderDetail.products')}</th>
                  <th className="text-center">{t('orderDetail.quantity')}</th>
                  <th className="text-end">{t('orderDetail.unitPrice')}</th>
                  <th className="text-end">{t('orderDetail.discount')}</th>
                  <th className="text-end">{t('orderDetail.subtotal')}</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line, i) => (
                  <tr key={i}>
                    <td>
                      {line.thumbnailUrl
                        ? <img src={line.thumbnailUrl} alt={line.productName} style={{ width: 54, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid #e9ecef' }} />
                        : <div style={{ width: 44, height: 44, background: '#f8f9fa', borderRadius: 6, border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{line.giftCard ? <FaGift className="text-primary" /> : '📦'}</div>
                      }
                    </td>
                    <td>
                      {line.giftCard ? (
                        <>
                          <div className="fw-semibold small">{t('giftCard.lineName')} · {t('giftCard.lineFor', { name: line.giftCard.recipientName })}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            {line.giftCard.code} · {t('orderDetail.cardBalance', { amount: formatPrice(line.giftCard.balance) })}
                            {line.giftCard.recipientEmail && <> · {t('orderDetail.cardSentTo', { email: line.giftCard.recipientEmail })}</>}
                          </div>
                          <Button variant="link" size="sm" className="p-0 mt-1" style={{ fontSize: 12 }}
                            disabled={downloadingLetterId === line.giftCard.id}
                            onClick={() => handleDownloadLetter(line.giftCard!.id, line.giftCard!.code)}>
                            <FaFileDownload className="me-1" />{t('orderDetail.downloadLetter')}
                          </Button>
                        </>
                      ) : (
                        <>
                      <div className="fw-semibold small">{line.productName}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{line.productCode}</div>
                        </>
                      )}
                      {canReview && line.variantId && (
                        <Link to={`/variant/${line.variantId}#reviews`} className="d-inline-flex align-items-center gap-1 mt-1" style={{ fontSize: 12 }}>
                          <FaStar className="text-warning" /> {t('orderDetail.leaveReview')}
                        </Link>
                      )}
                    </td>
                    <td className="text-center">{line.giftCard ? line.quantity : `${line.quantity} m`}</td>
                    <td className="text-end">{formatPrice(line.unitPrice)}</td>
                    <td className="text-end">{line.discountPercent > 0 ? `${line.discountPercent}%` : '—'}</td>
                    <td className="text-end fw-semibold">{formatPrice(line.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {(order.couponDiscountAmount ?? 0) > 0 && (
                  <tr>
                    <td colSpan={5} className="text-end text-muted">{t('orderDetail.coupon', { code: order.couponCode ?? '' })}</td>
                    <td className="text-end text-success">−{formatPrice(order.couponDiscountAmount ?? 0)}</td>
                  </tr>
                )}
                {!order.isGiftCardPurchase && (
                  <tr>
                    <td colSpan={5} className="text-end text-muted">{t('orderDetail.shippingCost')}</td>
                    <td className="text-end">
                      {order.shippingCost > 0 ? formatPrice(order.shippingCost) : t('orderDetail.free')}
                    </td>
                  </tr>
                )}
                {(order.recargoEquivalenciaAmount ?? 0) > 0 && (
                  <tr>
                    <td colSpan={5} className="text-end text-muted">{t('orderDetail.recargo')}</td>
                    <td className="text-end">{formatPrice(order.recargoEquivalenciaAmount ?? 0)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={5} className="text-end fw-bold fs-5">{t('orderDetail.total')}</td>
                  <td className="text-end fw-bold fs-5">{formatPrice(order.total)}</td>
                </tr>
                {(order.giftCardAmount ?? 0) > 0 && (
                  <>
                    <tr>
                      <td colSpan={5} className="text-end text-success small">{t('orderDetail.giftCardPaid', { code: order.giftCardCode })}</td>
                      <td className="text-end text-success small">−{formatPrice(order.giftCardAmount)}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="text-end text-muted small">{t('orderDetail.amountPaid')}</td>
                      <td className="text-end small">{formatPrice(order.total - (order.giftCardAmount ?? 0))}</td>
                    </tr>
                  </>
                )}
                {(order.refundedAmount ?? 0) > 0 && (
                  <tr>
                    <td colSpan={5} className="text-end text-muted small">{t('orderDetail.refunded')}</td>
                    <td className="text-end small">{formatPrice(order.refundedAmount ?? 0)}</td>
                  </tr>
                )}
              </tfoot>
            </Table>
          </Card.Body>
        </Card>
      </Container>

      <Modal show={showCancelConfirm} onHide={() => { setShowCancelConfirm(false); setCancelReason(''); }}>
        <Modal.Header closeButton>
          <Modal.Title>{t('orderDetail.cancelOrder')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cancelError && <Alert variant="danger" className="py-2">{cancelError}</Alert>}
          <p>{t('orderDetail.confirmCancel')}</p>
          <Form.Group>
            <Form.Label>{t('orderDetail.cancelReasonLabel')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder={t('orderDetail.cancelReasonPlaceholder')}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowCancelConfirm(false); setCancelReason(''); }} disabled={cancelling}>
            {t('orderDetail.keepOrder')}
          </Button>
          <Button variant="danger" onClick={handleCancelOrder} disabled={cancelling}>
            {t('orderDetail.confirmCancelButton')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showReturnModal} onHide={() => setShowReturnModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{t('orderDetail.requestReturn')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {returnError && <Alert variant="danger" className="py-2">{returnError}</Alert>}
          <p>{t('orderDetail.returnPrompt')}</p>
          <Form.Group>
            <Form.Label>{t('orderDetail.returnReasonLabel')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
              placeholder={t('orderDetail.returnReasonPlaceholder')}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReturnModal(false)} disabled={requestingReturn}>
            {t('orderDetail.keepOrder')}
          </Button>
          <Button variant="primary" onClick={handleRequestReturn} disabled={requestingReturn}>
            {t('orderDetail.confirmReturnButton')}
          </Button>
        </Modal.Footer>
      </Modal>
    </MainLayout>
  );
};

export default OrderDetailPage;
