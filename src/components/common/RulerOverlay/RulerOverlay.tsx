import React, { useEffect, useState } from 'react';
import './RulerOverlay.css';

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  imgRef: React.RefObject<HTMLImageElement | null>;
  realWidthCm: number;
}

/** Static cm ruler overlaid on the top/left edges of a product image known to be a
 *  true-to-scale, straight-on shot (VariantImage.isRealScale + RealWidthCm).
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

  const hTickCount = Math.floor(containerSize.width / pxPerCm);
  const vTickCount = Math.floor(containerSize.height / pxPerCm);

  return (
    <div className="ruler-overlay" aria-hidden="true">
      <div className="ruler-axis ruler-axis--h">
        {Array.from({ length: hTickCount + 1 }, (_, cm) => (
          <div
            key={cm}
            className={`ruler-tick ruler-tick--h${cm % 5 === 0 ? ' ruler-tick--major' : ''}`}
            style={{ left: cm * pxPerCm }}
          >
            {cm % 5 === 0 && <span className="ruler-label ruler-label--h">{cm}</span>}
          </div>
        ))}
      </div>
      <div className="ruler-axis ruler-axis--v">
        {Array.from({ length: vTickCount + 1 }, (_, cm) => (
          <div
            key={cm}
            className={`ruler-tick ruler-tick--v${cm % 5 === 0 ? ' ruler-tick--major' : ''}`}
            style={{ top: cm * pxPerCm }}
          >
            {cm % 5 === 0 && <span className="ruler-label ruler-label--v">{cm}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RulerOverlay;
