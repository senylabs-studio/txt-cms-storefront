import React, { useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Button, Badge, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaShoppingCart } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../../contexts/CartContext';
import { useAuth } from '../../../contexts/AuthContext';
import './FeaturedProductsGrid.css';

/** Shape the backend resolves variantIds/productIds into server-side (see homeService.ts). */
export interface FeaturedProductItem {
  id: number;
  name: string;
  slug?: string;
  price: number;
  originalPrice: number;
  discountPercent?: number;
  availableStock: number;
  thumbnailUrl?: string;
  imageUrls?: string[];
  hasVariants?: boolean;
}

interface Props {
  title?: string;
  variants?: FeaturedProductItem[];
  products?: FeaturedProductItem[];
}

type Item = FeaturedProductItem & { _isVariant: boolean };

/** Card grid for "featured products" blocks — shared by the Home landing page and
 *  content-page blocks, since both resolve to the same variants/products shape. */
const FeaturedProductsGrid: React.FC<Props> = ({ title, variants = [], products = [] }) => {
  const { t } = useTranslation();
  const { addItem, loading: cartLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const allItems: Item[] = [
    ...variants.map(v => ({ ...v, _isVariant: true })),
    ...products.map(p => ({ ...p, _isVariant: false })),
  ];

  if (allItems.length === 0) return null;

  const handleAdd = async (e: React.MouseEvent, item: Item) => {
    e.preventDefault();
    if (!isAuthenticated) { navigate('/login'); return; }
    setError('');
    try {
      if (item._isVariant) await addItem(undefined, item.id, 1);
      else if (!item.hasVariants) await addItem(item.id, undefined, 1);
      else navigate(`/product/${item.slug}`);
    } catch (err) {
      setError((axios.isAxiosError(err) && err.response?.data?.message) ?? t('product.addError'));
    }
  };

  return (
    <Container className="py-4">
      {title && <h2 className="text-center mb-4 fw-bold">{title}</h2>}
      {error && <Alert variant="danger" className="py-2">{error}</Alert>}
      <Row className="g-3 justify-content-center">
        {allItems.map(item => {
          const slug = item._isVariant ? `/variant/${item.id}` : `/product/${item.slug}`;
          const outOfStock = item.availableStock <= 0;
          const hasDiscount = item.originalPrice > item.price;
          const hasGroupDiscount = (item.discountPercent ?? 0) > 0;
          const thumbnail = item.thumbnailUrl ?? item.imageUrls?.[0];

          return (
            <Col key={`${item._isVariant ? 'v' : 'p'}-${item.id}`} xs={6} sm={4} md={3} lg={2}>
              <div className="home-featured-card h-100">
                <Link to={slug} className="d-block position-relative">
                  {thumbnail
                    ? <img src={thumbnail} alt={item.name} className="home-featured-img" />
                    : <div className="home-featured-placeholder">📦</div>}
                  {(hasDiscount || hasGroupDiscount) && (
                    <Badge bg="danger" className="position-absolute top-0 start-0 m-2" style={{ fontSize: 10 }}>
                      {hasGroupDiscount ? `−${item.discountPercent}%` : t('product.offer')}
                    </Badge>
                  )}
                  {outOfStock && <div className="home-featured-outofstock">{t('product.outOfStock')}</div>}
                </Link>
                <div className="p-2">
                  <div className="home-featured-name"><Link to={slug}>{item.name}</Link></div>
                  <div className="d-flex align-items-baseline gap-1 mt-1">
                    <span className="fw-bold text-danger">€{item.price?.toFixed(2)}</span>
                    {(hasDiscount || hasGroupDiscount) && (
                      <span className="text-muted text-decoration-line-through small">€{item.originalPrice?.toFixed(2)}</span>
                    )}
                  </div>
                  <Button
                    variant={outOfStock ? 'outline-secondary' : 'primary'}
                    size="sm" className="w-100 mt-2"
                    disabled={outOfStock || cartLoading}
                    onClick={e => handleAdd(e, item)}
                  >
                    <FaShoppingCart className="me-1" />
                    {outOfStock ? t('product.outOfStock') : !item._isVariant && item.hasVariants ? t('product.viewOptions') : t('product.add')}
                  </Button>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

export default FeaturedProductsGrid;
