import type React from 'react';

type H = 'left' | 'center' | 'right';
type V = 'top' | 'middle' | 'bottom';

const FLEX_H: Record<H, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
const FLEX_V: Record<V, string> = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };

/**
 * Places a banner slide's text block in one of the 3×3 positions picked in the CMS, for a
 * flex-container slide (`.home-banner` / `.pbr-banner`). Unset fields keep the historical
 * centered layout.
 */
export const bannerTextPlacement = (h?: H, v?: V): React.CSSProperties => ({
  justifyContent: FLEX_H[h ?? 'center'],
  alignItems: FLEX_V[v ?? 'middle'],
});
