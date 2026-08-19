import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaArrowLeft } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import VariantCard from '../../components/Product/VariantCard/VariantCard';
import { getProductBySlug } from '../../services/productService';
import { formatComposition } from '../../utils/composition';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import type { StorefrontProduct, StorefrontVariant } from '../../types';

const ProductDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { siteName } = useSiteSettings();

  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useDocumentMeta(
    product ? `${product.name} — ${siteName}` : siteName,
    product?.description || undefined,
  );

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getProductBySlug(slug)
      .then(p => {
        setProduct(p);
        // If product has no variants, redirect to catalog
        if (!p.variants || p.variants.length === 0) navigate('/catalog', { replace: true });
      })
      .catch(e => { if (e?.response?.status === 404) setNotFound(true); else navigate('/catalog'); })
      .finally(() => setLoading(false));
  }, [slug, i18n.language]);

  if (loading) return <MainLayout><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></MainLayout>;
  if (notFound) return <MainLayout><Container className="py-5"><Alert variant="warning">{t('product.productNotFound')}</Alert></Container></MainLayout>;
  if (!product) return null;

  const variants: StorefrontVariant[] = (product.variants ?? []).map(v => ({
    ...v,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    productTypeName: product.productTypeName,
  }));

  const inStock = variants.filter(v => v.availableStock > 0).length;

  return (
    <MainLayout>
      <Container className="py-4">
        <button className="btn btn-link p-0 mb-4 text-muted" onClick={() => navigate(-1)}>
          <FaArrowLeft className="me-1" /> {t('product.back')}
        </button>

        {/* Product header */}
        <div className="mb-4">
          {product.productTypeName && (
            <div className="text-muted small text-uppercase mb-1">{product.productTypeName}</div>
          )}
          <h1 className="h2 fw-bold mb-2">{product.name}</h1>
          <div className="d-flex gap-2 align-items-center mb-3">
            <Badge bg="secondary">{t('product.referencesCount', { count: variants.length })}</Badge>
            {inStock > 0
              ? <Badge bg="success">{t('product.inStockCount', { count: inStock })}</Badge>
              : <Badge bg="secondary">{t('product.outOfStock')}</Badge>}
          </div>
          {product.description && (
            <p className="text-muted" style={{ maxWidth: 700, whiteSpace: 'pre-line' }}>{product.description}</p>
          )}
          {(product.width && product.width > 0 || product.composition) && (
            <table className="table table-sm" style={{ maxWidth: 400, fontSize: '0.875rem' }}>
              <tbody>
                {product.width && product.width > 0 && (
                  <tr>
                    <td className="text-muted fw-semibold" style={{ width: 140 }}>{t('product.width')}</td>
                    <td>{product.width} {t('product.widthUnit')}</td>
                  </tr>
                )}
                {formatComposition(product.composition) && (
                  <tr>
                    <td className="text-muted fw-semibold align-top">{t('product.composition')}</td>
                    <td>{formatComposition(product.composition)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Variant grid */}
        <Row xs={2} sm={2} md={3} lg={4} className="g-3">
          {variants.map(v => (
            <Col key={v.id}>
              <VariantCard variant={v} />
            </Col>
          ))}
        </Row>
      </Container>
    </MainLayout>
  );
};

export default ProductDetailPage;
