import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatPercentOff, getDiscountInfo, salePercent } from '../../../utils/pricing';
import './OfferBadge.css';

interface Props {
  price: number;
  originalPrice: number;
  discountPercent?: number;
  className?: string;
}

/** The red discount label of a card or a variant page. A group discount shows its percentage
 *  («−10 %»); a sale shows «OFERTA | −40 %» (option B, user 2026-10-26), or just «OFERTA» when it
 *  takes off less than 1 %. Nothing without a discount. */
const OfferBadge: React.FC<Props> = ({ price, originalPrice, discountPercent, className }) => {
  const { t } = useTranslation();
  const { hasGroupDiscount, hasDiscount } = getDiscountInfo(price, originalPrice, discountPercent);
  if (!hasDiscount) return null;
  const classes = (base: string) => `${base}${className ? ` ${className}` : ''}`;

  if (hasGroupDiscount) return <span className={classes('offer-badge')}>{formatPercentOff(discountPercent!)}</span>;

  const percent = salePercent(price, originalPrice);
  return (
    <span className={classes('offer-badge offer-badge--sale')}>
      <span>{t('product.offer')}</span>
      {percent > 0 && <span className="offer-badge__percent">{formatPercentOff(percent)}</span>}
    </span>
  );
};

export default OfferBadge;
