import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import type { PageFilterFacets } from '../../types';
import type { PageFilters } from '../../services/pageService';

// ─── Dual range slider ────────────────────────────────────────────────────────

const THUMB = 18;

const sliderCss = `
  .prs input[type=range] {
    -webkit-appearance: none; appearance: none;
    position: absolute; width: 100%; height: 0;
    background: transparent; pointer-events: none;
    outline: none; top: 50%; transform: translateY(-50%); margin: 0;
  }
  .prs input[type=range]::-webkit-slider-runnable-track { background: transparent; }
  .prs input[type=range]::-moz-range-track { background: transparent; }
  .prs input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: ${THUMB}px; height: ${THUMB}px; border-radius: 50%;
    background: #0d6efd; border: 2px solid #fff;
    box-shadow: 0 1px 5px rgba(0,0,0,.25);
    cursor: pointer; pointer-events: all;
    margin-top: -${THUMB / 2}px;
    transition: box-shadow .15s;
  }
  .prs input[type=range]:active::-webkit-slider-thumb {
    box-shadow: 0 0 0 5px rgba(13,110,253,.2);
  }
  .prs input[type=range]::-moz-range-thumb {
    width: ${THUMB}px; height: ${THUMB}px; border-radius: 50%;
    background: #0d6efd; border: 2px solid #fff;
    box-shadow: 0 1px 5px rgba(0,0,0,.25);
    cursor: pointer; pointer-events: all;
  }
`;

interface SliderProps {
  min: number; max: number;
  valueMin: number; valueMax: number;
  onChange: (min: number, max: number) => void;
}

const PriceRangeSlider: React.FC<SliderProps> = ({ min, max, valueMin, valueMax, onChange }) => {
  const range = max - min || 1;
  const lPct = ((valueMin - min) / range) * 100;
  const rPct = ((max - valueMax) / range) * 100;

  const onMin = (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(Math.min(+e.target.value, valueMax - 1), valueMax);
  const onMax = (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(valueMin, Math.max(+e.target.value, valueMin + 1));

  return (
    <div className="prs" style={{ position: 'relative', height: 34 }}>
      <style>{sliderCss}</style>
      <div style={{
        position: 'absolute', top: 'calc(50% - 4px)', transform: 'translateY(-50%)',
        left: 0, right: 0, height: 4, background: '#dee2e6', borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', top: 'calc(50% - 4px)', transform: 'translateY(-50%)',
        left: `${lPct}%`, right: `${rPct}%`,
        height: 4, background: '#0d6efd', borderRadius: 4,
      }} />
      <input type="range" min={min} max={max} step={1} value={valueMin} onChange={onMin}
        style={{ zIndex: valueMin > max - range * 0.1 ? 5 : 3 }} />
      <input type="range" min={min} max={max} step={1} value={valueMax} onChange={onMax}
        style={{ zIndex: 4 }} />
    </div>
  );
};

// ─── Vertical filter panel ────────────────────────────────────────────────────

interface Props {
  facets: PageFilterFacets;
  filters: PageFilters;
  onChange: (f: PageFilters) => void;
  onClose?: () => void;
}

const sep = <hr style={{ margin: '12px 0', borderColor: '#e9ecef' }} />;

const ProductFilters: React.FC<Props> = ({ facets, filters, onChange, onClose }) => {
  const { t } = useTranslation();
  const absMin = Math.floor(facets.minPrice);
  const absMax = Math.ceil(facets.maxPrice);
  const showPrice = absMax > absMin;

  // Draft state — buffered locally until user clicks "Ver resultados"
  const [draft, setDraft] = useState<PageFilters>(filters);
  const [localMin, setLocalMin] = useState(filters.minPrice ?? absMin);
  const [localMax, setLocalMax] = useState(filters.maxPrice ?? absMax);

  // Sync draft when committed filters change from outside (e.g. slug change resets to {}), and
  // also when facets arrive — this panel is always mounted (just CSS-hidden until opened), so on
  // first render facets is still the {0,0,[],[]} placeholder the parent seeds before its async
  // fetch resolves; without absMin/absMax here, localMin/localMax would permanently stick at the
  // 0/0 they were lazily initialized to, showing "€0 – €0" even once real prices are in.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-syncs the draft/slider state when applied filters or facets change (see comment above)
    setDraft(filters);
    setLocalMin(filters.minPrice ?? absMin);
    setLocalMax(filters.maxPrice ?? absMax);
  }, [filters, absMin, absMax]);

  const handleSlider = (newMin: number, newMax: number) => {
    setLocalMin(newMin);
    setLocalMax(newMax);
    setDraft(d => ({
      ...d,
      minPrice: newMin <= absMin ? undefined : newMin,
      maxPrice: newMax >= absMax ? undefined : newMax,
    }));
  };

  const hasActive = draft.minPrice !== undefined || draft.maxPrice !== undefined
    || draft.width !== undefined || !!draft.material || !!draft.orderBy;

  const reset = () => {
    setDraft({});
    setLocalMin(absMin);
    setLocalMax(absMax);
    onChange({});
  };

  const apply = () => {
    onChange(draft);
    onClose?.();
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: '#6c757d', marginBottom: 6,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* Sort */}
      <div>
        <div style={labelStyle}>{t('filters.sortBy')}</div>
        <Form.Select size="sm" value={draft.orderBy ?? ''}
          onChange={e => setDraft(d => ({ ...d, orderBy: e.target.value || undefined }))}>
          <option value="">{t('filters.default')}</option>
          <option value="price_asc">{t('filters.priceAsc')}</option>
          <option value="price_desc">{t('filters.priceDesc')}</option>
          <option value="name_asc">{t('filters.nameAsc')}</option>
          <option value="name_desc">{t('filters.nameDesc')}</option>
        </Form.Select>
      </div>

      {/* Price */}
      {showPrice && <>
        {sep}
        <div>
          <div style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('filters.price')}</span>
            <span style={{ color: '#0d6efd', fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>
              €{localMin} – €{localMax}
            </span>
          </div>
          <PriceRangeSlider
            min={absMin} max={absMax}
            valueMin={localMin} valueMax={localMax}
            onChange={handleSlider}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#adb5bd', marginTop: 2 }}>
            <span>€{absMin}</span>
            <span>€{absMax}</span>
          </div>
        </div>
      </>}

      {/* Width */}
      {facets.widths.length > 0 && <>
        {sep}
        <div>
          <div style={labelStyle}>{t('filters.width')}</div>
          <Form.Select size="sm" value={draft.width?.toString() ?? ''}
            onChange={e => setDraft(d => ({ ...d, width: e.target.value ? parseFloat(e.target.value) : undefined }))}>
            <option value="">{t('filters.all')}</option>
            {facets.widths.map(w => <option key={w} value={w}>{w} cm</option>)}
          </Form.Select>
        </div>
      </>}

      {/* Composition */}
      {facets.materials.length > 0 && <>
        {sep}
        <div>
          <div style={labelStyle}>{t('filters.composition')}</div>
          <Form.Select size="sm" value={draft.material ?? ''}
            onChange={e => setDraft(d => ({ ...d, material: e.target.value || undefined }))}>
            <option value="">{t('filters.all')}</option>
            {facets.materials.map(m => <option key={m} value={m}>{m}</option>)}
          </Form.Select>
        </div>
      </>}

      {/* Actions */}
      {sep}
      <div style={{ display: 'flex', gap: 8 }}>
        {hasActive && (
          <Button size="sm" variant="outline-secondary" className="flex-grow-1" onClick={reset}>
            <FaTimes className="me-1" />{t('filters.clear')}
          </Button>
        )}
        {onClose && (
          <Button size="sm" variant="primary" className="flex-grow-1" onClick={apply}>
            {t('filters.viewResults')}
          </Button>
        )}
      </div>

    </div>
  );
};

export default ProductFilters;
