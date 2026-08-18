import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Offcanvas, Button, Alert } from 'react-bootstrap';
import { FaTrash, FaMinus, FaPlus, FaShoppingBag } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../../contexts/CartContext';
import './CartDrawer.css';

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
      setItemError((axios.isAxiosError(e) ? e.response?.data?.message : undefined) ?? t('cart.updateError'));
    }
  };

  const handleRemove = async (itemId: number) => {
    setItemError('');
    try {
      await removeItem(itemId);
    } catch (e) {
      setItemError((axios.isAxiosError(e) ? e.response?.data?.message : undefined) ?? t('cart.removeError'));
    }
  };

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
  }, [cart?.expiresAt, t]);

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
                      : <div className="cart-item-placeholder">📦</div>}
                  </div>
                  <div className="cart-item-info flex-grow-1">
                    <div className="cart-item-name">{item.productName}</div>
                    <div className="cart-item-price">
                      {item.unitPrice < item.originalUnitPrice && (
                        <span style={{ textDecoration: 'line-through', color: '#aaa', marginRight: 4, fontSize: '0.8em' }}>
                          €{item.originalUnitPrice.toFixed(2)}
                        </span>
                      )}
                      <span style={item.unitPrice < item.originalUnitPrice ? { color: '#dc3545', fontWeight: 600 } : {}}>
                        €{item.unitPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="cart-item-qty">
                      <button className="qty-btn" disabled={loading || item.quantity <= 1} onClick={() => handleUpdate(item.id, item.quantity - 1)}>
                        <FaMinus size={10} />
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="qty-btn" disabled={loading || item.quantity >= item.availableStock} onClick={() => handleUpdate(item.id, item.quantity + 1)}>
                        <FaPlus size={10} />
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-subtotal">
                    <div className="fw-semibold">€{item.subtotal.toFixed(2)}</div>
                    <button className="remove-btn" onClick={() => handleRemove(item.id)} disabled={loading}>
                      <FaTrash size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              {(cart!.discountPercent ?? 0) > 0 && (
                <div className="d-flex justify-content-between small text-success mb-1">
                  <span>{t('cart.discount', { percent: cart!.discountPercent })}</span>
                  <span>−€{cart!.items.reduce((s, i) => s + (i.originalUnitPrice - i.unitPrice) * i.quantity, 0).toFixed(2)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                <span>{t('cart.total')}</span>
                <span>€{(cart!.total ?? 0).toFixed(2)}</span>
              </div>
              <Button variant="primary" size="lg" className="w-100 mb-2" onClick={() => { closeDrawer(); navigate('/checkout'); }}>
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
