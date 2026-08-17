import React, { useEffect, useState } from 'react';
import { Container, Table, Badge, Button, Spinner, Pagination } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaEye } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { getOrders } from '../../services/profileService';
import type { StorefrontOrder } from '../../types';
import { ORDER_STATUS_VARIANT } from '../../utils/orderStatus';

const OrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<StorefrontOrder[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOrders(currentPage, 10)
      .then(r => { setOrders(r.items); setTotalPages(r.totalPages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentPage]);

  return (
    <MainLayout>
      <Container className="py-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          <Button variant="link" className="p-0 text-muted" onClick={() => navigate('/account')}>
            <FaArrowLeft /> {t('orders.backToAccount')}
          </Button>
          <h2 className="fw-bold mb-0">{t('orders.title')}</h2>
        </div>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p>{t('orders.noOrders')}</p>
            <Button variant="primary" onClick={() => navigate('/catalog')}>{t('orders.browseCatalog')}</Button>
          </div>
        ) : (
          <>
            <Table hover responsive>
              <thead className="table-light">
                <tr>
                  <th>{t('orders.colId')}</th>
                  <th>{t('orders.colDate')}</th>
                  <th>{t('orders.colStatus')}</th>
                  <th className="text-end">{t('orders.colTotal')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="fw-semibold">#{o.id}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString('es-ES')}</td>
                    <td>
                      <Badge bg={ORDER_STATUS_VARIANT[o.status] ?? 'secondary'}>
                        {t(`orders.statuses.${o.status}`, { defaultValue: o.status })}
                      </Badge>
                    </td>
                    <td className="text-end fw-bold">€{o.total.toFixed(2)}</td>
                    <td className="text-end">
                      <Link to={`/account/orders/${o.id}`} className="btn btn-sm btn-outline-secondary">
                        <FaEye />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-3">
                <Pagination>
                  <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} />
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} />
                </Pagination>
              </div>
            )}
          </>
        )}
      </Container>
    </MainLayout>
  );
};

export default OrdersPage;
