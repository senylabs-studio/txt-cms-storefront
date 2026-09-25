import React, { useEffect, useState } from 'react';
import './RulerOverlay.css';

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  imgRef: React.RefObject<HTMLImageElement | null>;
  realWidthCm: number;
}

/** Thickness of each tape, in px — keep in sync with --ruler-size in RulerOverlay.css. */
const RULER_SIZE = 28;

/** Numbers every cm when there's room for them, otherwise every 2 or 5 cm. */
const labelStep = (pxPerCm: number) => (pxPerCm >= 22 ? 1 : pxPerCm >= 12 ? 2 : 5);

/** cm tape measures along the bottom and left edges of a product image known to be a
 *  true-to-scale, straight-on shot (VariantImage.isRealScale + RealWidthCm). Both tapes start
 *  at 0 in the inner corner where they meet, so what they measure is the visible fabric.
 *
 *  The image is displayed with object-fit: cover inside a possibly non-square
 *  container, so the on-screen scale isn't simply containerWidth / realWidthCm —
 *  cover scales the image uniformly (never distorts) by whichever factor makes it
 *  fully cover the container, then crops the overflow. That uniform factor is what
 *  we need, derived from the image's natural pixel size vs. the container's
 *  rendered size. */
const RulerOverlay: React.FC<Props> = ({ containerRef, imgRef, realWidthCm }) => {
  const [pxPerCm, setPxPerCm] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img || !img.naturalWidth || !img.naturalHeight) return;
      const { width: containerW, height: containerH } = container.getBoundingClientRect();
      const scale = Math.max(containerW / img.naturalWidth, containerH / img.naturalHeight);
      setPxPerCm((scale * img.naturalWidth) / realWidthCm);
      setContainerSize({ width: containerW, height: containerH });
    };

    compute();
    const img = imgRef.current;
    img?.addEventListener('load', compute);

    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      img?.removeEventListener('load', compute);
      ro.disconnect();
    };
  }, [containerRef, imgRef, realWidthCm]);

  if (!pxPerCm) return null;

  const step = labelStep(pxPerCm);
  const halfTicks = pxPerCm >= 16;
  const hLength = containerSize.width - RULER_SIZE;
  const vLength = containerSize.height - RULER_SIZE;

  // Every tick position along one tape, in half-cm units when there's room for them.
  const ticks = (lengthPx: number) => {
    const unit = halfTicks ? 0.5 : 1;
    const count = Math.floor(lengthPx / (pxPerCm * unit));
    return Array.from({ length: count + 1 }, (_, i) => i * unit);
  };
  const tickClass = (cm: number) =>
    !Number.isInteger(cm) ? ' ruler-tick--half' : cm % 5 === 0 ? ' ruler-tick--major' : '';
  const showLabel = (cm: number) => Number.isInteger(cm) && cm % step === 0;

  return (
    <div className="ruler-overlay" aria-hidden="true">
      <div className="ruler-axis ruler-axis--h">
        {ticks(hLength).map(cm => (
          <div key={cm} className={`ruler-tick ruler-tick--h${tickClass(cm)}`} style={{ left: cm * pxPerCm }}>
            {showLabel(cm) && cm > 0 && <span className="ruler-label ruler-label--h">{cm}</span>}
          </div>
        ))}
      </div>
      <div className="ruler-axis ruler-axis--v">
        {ticks(vLength).map(cm => (
          <div key={cm} className={`ruler-tick ruler-tick--v${tickClass(cm)}`} style={{ bottom: cm * pxPerCm }}>
            {showLabel(cm) && cm > 0 && <span className="ruler-label ruler-label--v">{cm}</span>}
          </div>
        ))}
      </div>
      <div className="ruler-corner">cm</div>
    </div>
  );
};

export default RulerOverlay;
