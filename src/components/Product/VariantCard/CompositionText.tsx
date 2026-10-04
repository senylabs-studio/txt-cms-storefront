import React, { useLayoutEffect, useRef, useState } from 'react';
import { parseComposition } from '../../../utils/composition';
import { useMaterialAbbreviations } from '../../../hooks/useMaterialAbbreviations';

type Mode = 'full' | 'short' | 'wrap';

// A card's composition on one line in full ("60% Algodón · 40% Poliéster") when it fits; if not,
// with fibre codes ("60% CO · 40% PES", each code an <abbr> with the full name); if that still
// doesn't fit, wrapping between materials. A long one used to be cut off on phones.
const CompositionText: React.FC<{ json?: string }> = ({ json }) => {
  const codes = useMaterialAbbreviations();
  const parts = parseComposition(json);
  const ref = useRef<HTMLSpanElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const hasCodes = parts.some(p => codes.has(p.material.toLowerCase()));
  // The mode found for one text, set of codes and width; any change starts again from 'full'.
  const fitKey = `${json}|${hasCodes}|${boxWidth}`;
  const [fit, setFit] = useState<{ key: string; mode: Mode }>({ key: fitKey, mode: 'full' });
  const mode: Mode = fit.key === fitKey ? fit.mode : 'full';

  useLayoutEffect(() => {
    const box = ref.current?.parentElement;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setBoxWidth(Math.round(box.clientWidth)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Before paint: if this mode doesn't fit, step to the next one.
  useLayoutEffect(() => {
    const span = ref.current;
    const box = span?.parentElement;
    if (!span || !box || mode === 'wrap') return;
    if (span.getBoundingClientRect().width <= box.clientWidth + 0.5) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measuring the rendered text is the only way to know it doesn't fit
    setFit({ key: fitKey, mode: mode === 'full' && hasCodes ? 'short' : 'wrap' });
  }, [mode, fitKey, hasCodes]);

  if (parts.length === 0) return null;

  const label = (p: (typeof parts)[number]) => {
    const code = mode !== 'full' ? codes.get(p.material.toLowerCase()) : undefined;
    return (
      <>
        {p.percentage}%{' '}
        {code ? <abbr title={p.material}>{code}</abbr> : p.material}
      </>
    );
  };

  return (
    <span ref={ref} className={`product-card-composition${mode === 'wrap' ? ' is-wrapping' : ''}`}>
      {parts.map((p, i) => (
        <React.Fragment key={`${p.material}-${i}`}>
          {i > 0 && ' · '}
          <span className="product-card-composition-part">{label(p)}</span>
        </React.Fragment>
      ))}
    </span>
  );
};

export default CompositionText;
