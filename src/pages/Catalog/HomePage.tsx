import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, InputGroup, Button, Spinner, Pagination } from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import VariantCard from '../../components/Product/VariantCard/VariantCard';
import { getVariantsPaged } from '../../services/productService';
import type { StorefrontVariant } from '../../types';
import useDebounce from '../../hooks/useDebounce';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [variants, setVariants] = useState<StorefrontVariant[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
  }, [searchParams]);
  const [orderBy, setOrderBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setLoading(true);
    getVariantsPaged(currentPage, 12, debouncedSearch, undefined, orderBy, 'asc')
      .then(r => { setVariants(r.items); setTotalPages(r.totalPages); setTotalItems(r.totalItems); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentPage, debouncedSearch, orderBy]);

  useEffect(() => {
    setCurrentPage(1);
    if (debouncedSearch) setSearchParams({ search: debouncedSearch });
    else setSearchParams({});
  }, [debouncedSearch]);

  return (
    <MainLayout>
      <Container className="py-4">
        <div className="catalog-hero mb-4">
          <h1 className="catalog-title">{t('catalog.home.title')}</h1>
          <p className="catalog-subtitle text-muted">{t('catalog.home.itemsAvailable', { count: totalItems })}</p>
        </div>

        <Row className="mb-4 align-items-center">
          <Col md={6}>
            <InputGroup>
              <Form.Control
                placeholder={t('catalog.home.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <InputGroup.Text><FaSearch /></InputGroup.Text>
            </InputGroup>
          </Col>
          <Col md={3} className="ms-auto">
            <Form.Select value={orderBy} onChange={e => { setOrderBy(e.target.value); setCurrentPage(1); }}>
              <option value="name">{t('filters.nameAsc')}</option>
              <option value="price">{t('filters.priceAsc')}</option>
              <option value="price_desc">{t('filters.priceDesc')}</option>
            </Form.Select>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : variants.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p>{search ? t('catalog.home.noResultsFor', { search }) : t('catalog.home.noResults')}</p>
            {search && <Button variant="outline-primary" onClick={() => setSearch('')}>{t('catalog.home.viewAll')}</Button>}
          </div>
        ) : (
          <Row xs={2} sm={2} md={3} lg={4} className="g-3">
            {variants.map(v => (
              <Col key={v.id}>
                <VariantCard variant={v} />
              </Col>
            ))}
          </Row>
        )}

        {totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4">
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
      </Container>
    </MainLayout>
  );
};

export default HomePage;
