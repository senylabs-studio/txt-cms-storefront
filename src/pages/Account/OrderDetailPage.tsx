import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFileDownload } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { getOrderDetail, downloadOrderInvoice } from '../../services/profileService';
import type { StorefrontOrderDetail } from '../../types';
import { ORDER_STATUS_VARIANT } from '../../utils/orderStatus';

const OrderDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<StorefrontOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOrderDetail(Number(id))
      .then(setOrder)
      .catch(() => navigate('/account/orders'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <MainLayout><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></MainLayout>;
  if (!order) return null;

  const canDownloadInvoice = order.status !== 'PendingPayment' && order.status !== 'Cancelled';

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true);
    try { await downloadOrderInvoice(order.id); }
    finally { setDownloadingInvoice(false); }
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
          {canDownloadInvoice && (
            <Button
              variant="outline-secondary"
              size="sm"
              className="ms-auto"
              disabled={downloadingInvoice}
              onClick={handleDownloadInvoice}
            >
              <FaFileDownload className="me-2" />
              {t('orderDetail.downloadInvoice')}
            </Button>
          )}
        </div>

        <Row className="mb-4">
          <Col md={6} className="mb-3">
            <Card className="h-100">
              <Card.Body>
                <h6 className="fw-semibold mb-2">{t('orderDetail.info')}</h6>
                <div className="text-muted small">{t('orderDetail.date')} {new Date(order.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
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
                    <div>{order.shippingAddress.country}</div>
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
                        ? <img src={line.thumbnailUrl} alt={line.productName} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #e9ecef' }} />
                        : <div style={{ width: 44, height: 44, background: '#f8f9fa', borderRadius: 6, border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📦</div>
                      }
                    </td>
                    <td>
                      <div className="fw-semibold small">{line.productName}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{line.productCode}</div>
                    </td>
                    <td className="text-center">{line.quantity} m</td>
                    <td className="text-end">€{line.unitPrice.toFixed(2)}</td>
                    <td className="text-end">{line.discountPercent > 0 ? `${line.discountPercent}%` : '—'}</td>
                    <td className="text-end fw-semibold">€{line.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-end text-muted">{t('orderDetail.shippingCost')}</td>
                  <td className="text-end">
                    {order.shippingCost > 0 ? `€${order.shippingCost.toFixed(2)}` : t('orderDetail.free')}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="text-end fw-bold fs-5">{t('orderDetail.total')}</td>
                  <td className="text-end fw-bold fs-5">€{order.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </Table>
          </Card.Body>
        </Card>
      </Container>
    </MainLayout>
  );
};

export default OrderDetailPage;
