import React from 'react';
import { Row, Col } from 'react-bootstrap';
import VariantCard from '../Product/VariantCard/VariantCard';
import type { StorefrontPageItem } from '../../types';

interface Props {
  items: StorefrontPageItem[];
  /** Cards per row from md up (2–6); narrower screens show 2–3. */
  columns?: number;
  style?: React.CSSProperties;
}

// A page's catalog items as variant cards — the Products block, and a category page's
// "ver todos" view, which lists its subpages' products whether or not it has that block.
const PageItemsGrid: React.FC<Props> = ({ items, columns = 4, style }) => (
  <div className="pbr-products" style={style}>
    <Row xs={2} sm={columns > 2 ? 3 : 2} md={columns} className="g-3">
      {items.map(item => (
        <Col key={item.variantId}>
          <VariantCard variant={{
            id: item.variantId,
            name: item.name,
            code: item.code,
            price: item.price,
            originalPrice: item.originalPrice,
            discountPercent: 0,
            availableStock: item.availableStock,
            thumbnailUrl: item.thumbnailUrl,
            typeValue: item.typeValue,
            productId: item.productId,
            productName: item.productName || item.name,
            productSlug: item.productSlug,
            width: item.width,
            composition: item.composition,
            minQuantity: item.minQuantity,
            quantityStep: item.quantityStep,
            isNew: item.isNew,
          }} />
        </Col>
      ))}
    </Row>
  </div>
);

export default PageItemsGrid;
