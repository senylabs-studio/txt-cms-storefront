import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Button, Card, Alert, Form } from 'react-bootstrap';
import { FaTrash, FaArrowRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

const CartPage: React.FC = () => {
  const { t } = useTranslation();
  const { cart, loading, fetchCart, updateItem, removeItem } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState('');
  const [itemError, setItemError] = useState('');

  const handleUpdate = async (itemId: number, quantity: number) => {
    setItemError('');
    try {
      await updateItem(itemId, quantity);
    } catch (e) {
      setItemError((axios.isAxiosError(e) && e.response?.data?.message) ?? t('cart.updateError'));
    }
  };

  const handleRemove = async (itemId: number) => {
    setItemError('');
    try {
      await removeItem(itemId);
    } catch (e) {
      setItemError((axios.isAxiosError(e) && e.response?.data?.message) ?? t('cart.removeError'));
    }
  };

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
                          ? <img src={item.thumbnailUrl} alt={item.productName} className="w-100 rounded" style={{ aspectRatio: '1', objectFit: 'cover' }} />
                          : <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ aspectRatio: '1', fontSize: 24 }}>📦</div>}
                      </Col>
                      <Col xs={9} sm={5}>
                        <div className="fw-semibold">{item.productName}</div>
                        <div className="text-muted small">{item.productCode}</div>
                        <div className="small">
                          {item.unitPrice < item.originalUnitPrice && (
                            <span className="text-muted text-decoration-line-through me-1">
                              €{item.originalUnitPrice.toFixed(2)}
                            </span>
                          )}
                          <span className={item.unitPrice < item.originalUnitPrice ? 'text-danger fw-semibold' : 'text-muted'}>
                            €{item.unitPrice.toFixed(2)} / m
                          </span>
                        </div>
                      </Col>
                      <Col sm={3} className="d-flex align-items-center mt-2 mt-sm-0">
                        <Form.Control
                          type="number"
                          min={0.3}
                          step={0.05}
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v >= 0.3) handleUpdate(item.id, v);
                          }}
                          style={{ width: 90 }}
                          disabled={loading}
                        />
                      </Col>
                      <Col sm={2} className="text-end mt-2 mt-sm-0">
                        <div className="fw-bold">€{item.subtotal.toFixed(2)}</div>
                        <Button size="sm" variant="link" className="text-danger p-0" onClick={() => handleRemove(item.id)} disabled={loading}>
                          <FaTrash size={12} />
                        </Button>
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
                      <span className="text-muted">{item.productName} x{item.quantity}m</span>
                      <span>€{item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  {(cart!.discountPercent ?? 0) > 0 && (
                    <div className="d-flex justify-content-between small text-success mb-1">
                      <span>{t('cart.discount', { percent: cart!.discountPercent })}</span>
                      <span>−€{(cart!.items.reduce((s, i) => s + (i.originalUnitPrice - i.unitPrice) * i.quantity, 0)).toFixed(2)}</span>
                    </div>
                  )}
                  <hr />
                  <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                    <span>{t('cart.total')}</span>
                    <span>€{(cart!.total ?? 0).toFixed(2)}</span>
                  </div>
                  <Button variant="primary" size="lg" className="w-100" onClick={() => navigate('/checkout')}>
                    {t('cart.checkout')} <FaArrowRight className="ms-1" />
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </MainLayout>
  );
};

export default CartPage;
