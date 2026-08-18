import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Button, Spinner, Badge, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaHeart, FaShoppingCart, FaTrash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { getFavorites, type FavoriteItem } from '../../services/favoriteService';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import './FavoritesPage.css';

const FavoritesPage: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toggle } = useFavorites();
  const { addItem, loading: cartLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try { setItems(await getFavorites()); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (item: FavoriteItem) => {
    await toggle(item.productId, item.variantId);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleAddToCart = async (item: FavoriteItem) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    const entity = item.variant ?? item.product;
    if (!entity) return;
    setError('');
    try {
      if (item.variantId) await addItem(undefined, item.variantId, 1);
      else if (item.productId && !entity.hasVariants) await addItem(item.productId, undefined, 1);
      else if (item.productId) navigate(`/product/${entity.slug}`);
    } catch (e) {
      setError((axios.isAxiosError(e) ? e.response?.data?.message : undefined) ?? t('product.addError'));
    }
  };

  if (loading) {
    return <MainLayout><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></MainLayout>;
  }

  return (
    <MainLayout>
      <Container className="py-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          <FaHeart className="text-danger fs-4" />
          <h2 className="mb-0">{t('favorites.title')}</h2>
          {items.length > 0 && <Badge bg="secondary">{items.length}</Badge>}
        </div>

        {error && <Alert variant="danger" className="py-2">{error}</Alert>}

        {items.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FaHeart size={48} className="mb-3 opacity-25" />
            <p className="fs-5">{t('favorites.empty')}</p>
            <Link to="/catalog" className="btn btn-primary">{t('favorites.explore')}</Link>
          </div>
        ) : (
          <Row className="g-3">
            {items.map(item => {
              const entity = item.variant ?? item.product;
              if (!entity) return null;
              const slug = item.variantId ? `/variant/${item.variantId}` : `/product/${entity.slug}`;
              const thumbnail = entity.thumbnailUrl ?? entity.imageUrls?.[0];
              const outOfStock = entity.availableStock <= 0;
              const hasDiscount = entity.originalPrice > entity.price;
              const hasGroupDiscount = (entity.discountPercent ?? 0) > 0;
              const showOriginal = hasDiscount || hasGroupDiscount;

              return (
                <Col key={item.id} xs={6} sm={4} md={3} lg={2}>
                  <div className="fav-card h-100">
                    <Link to={slug} className="d-block position-relative">
                      {thumbnail
                        ? <img src={thumbnail} alt={entity.name} className="fav-card-img" />
                        : <div className="fav-card-placeholder">📦</div>}
                      {(hasDiscount || hasGroupDiscount) && (
                        <Badge bg="danger" className="position-absolute top-0 start-0 m-2" style={{ fontSize: 10 }}>
                          {hasGroupDiscount ? `−${entity.discountPercent}%` : t('product.offer')}
                        </Badge>
                      )}
                      {outOfStock && <div className="fav-card-outofstock">{t('product.outOfStock')}</div>}
                    </Link>
                    <div className="p-2 d-flex flex-column gap-1">
                      <div className="fav-card-name">
                        <Link to={slug}>{entity.name}</Link>
                      </div>
                      <div className="d-flex align-items-baseline gap-1">
                        <span className="fw-bold text-danger">€{entity.price?.toFixed(2)}</span>
                        {showOriginal && (
                          <span className="text-muted text-decoration-line-through small">€{entity.originalPrice?.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="d-flex gap-1 mt-1">
                        <Button
                          variant={outOfStock ? 'outline-secondary' : 'primary'}
                          size="sm"
                          className="flex-grow-1"
                          disabled={outOfStock || cartLoading}
                          onClick={() => handleAddToCart(item)}
                        >
                          <FaShoppingCart className="me-1" />
                          {outOfStock ? t('product.outOfStock') : !item.variantId && entity.hasVariants ? t('product.viewOptions') : t('product.add')}
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleRemove(item)} title={t('favorites.remove')}>
                          <FaTrash />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>
    </MainLayout>
  );
};

export default FavoritesPage;
