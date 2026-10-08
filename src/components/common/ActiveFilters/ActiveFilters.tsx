import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import type { PageFilters } from '../../../services/pageService';
import './ActiveFilters.css';

interface Props {
  filters: PageFilters;
  onChange: (f: PageFilters) => void;
}

const SORT_LABELS: Record<string, string> = {
  price_asc: 'filters.priceAsc', price_desc: 'filters.priceDesc',
  name_asc: 'filters.nameAsc', name_desc: 'filters.nameDesc',
};

/** The filters in use, as removable chips above the products, plus "remove all". Nothing when
 *  none is on. Each chip drops just its own filter (price drops both ends). */
const ActiveFilters: React.FC<Props> = ({ filters, onChange }) => {
  const { t } = useTranslation();
  const without = (...keys: (keyof PageFilters)[]) => {
    const next = { ...filters };
    for (const k of keys) delete next[k];
    onChange(next);
  };

  const chips: { key: string; label: string; remove: () => void }[] = [];
  const { minPrice, maxPrice } = filters;
  if (minPrice !== undefined || maxPrice !== undefined) {
    const range = minPrice !== undefined && maxPrice !== undefined ? `${minPrice} € – ${maxPrice} €`
      : minPrice !== undefined ? t('filters.from', { value: `${minPrice} €` }) : t('filters.upTo', { value: `${maxPrice} €` });
    chips.push({ key: 'price', label: `${t('filters.price')}: ${range}`, remove: () => without('minPrice', 'maxPrice') });
  }
  if (filters.pattern) chips.push({ key: 'pattern', label: `${t('filters.pattern')}: ${t(`fabricPatterns.${filters.pattern}`)}`, remove: () => without('pattern') });
  for (const color of filters.colors ?? []) {
    chips.push({ key: `color-${color}`, label: `${t('filters.color')}: ${t(`fabricColors.${color}`)}`,
      remove: () => { const rest = filters.colors!.filter(c => c !== color); onChange({ ...filters, colors: rest.length ? rest : undefined }); } });
  }
  if (filters.width !== undefined) chips.push({ key: 'width', label: `${t('filters.width')}: ${filters.width} cm`, remove: () => without('width') });
  if (filters.material) chips.push({ key: 'material', label: `${t('filters.composition')}: ${filters.material}`, remove: () => without('material') });
  if (filters.onlyNew) chips.push({ key: 'onlyNew', label: t('filters.onlyNew'), remove: () => without('onlyNew') });
  if (filters.onlyOffers) chips.push({ key: 'onlyOffers', label: t('filters.onlyOffers'), remove: () => without('onlyOffers') });
  if (filters.orderBy && SORT_LABELS[filters.orderBy]) {
    chips.push({ key: 'orderBy', label: `${t('filters.sortBy')}: ${t(SORT_LABELS[filters.orderBy])}`, remove: () => without('orderBy') });
  }
  if (chips.length === 0) return null;

  return (
    <div className="active-filters" aria-label={t('filters.active')}>
      {chips.map(c => (
        <button key={c.key} type="button" className="active-filter-chip" onClick={c.remove}
          title={t('filters.remove', { filter: c.label })} aria-label={t('filters.remove', { filter: c.label })}>
          <span>{c.label}</span>
          <FaTimes aria-hidden="true" />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" className="active-filters-clear" onClick={() => onChange({})}>
          {t('filters.clearAll')}
        </button>
      )}
    </div>
  );
};

export default ActiveFilters;
