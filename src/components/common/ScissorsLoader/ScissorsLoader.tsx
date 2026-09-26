import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import './ScissorsLoader.css';

// The circle the scissors follow, starting at the top and running clockwise — the same path is
// both the dashed cut line and its reveal mask, so the cut always ends right at the pivot.
const CUT_PATH = 'M50 16 A34 34 0 1 1 49.99 16';

/** One blade + its handle ring, pivot screw at (0,0), tip pointing towards +x. */
const Half: React.FC = () => (
  <>
    <path className="scissors-loader__handle" d="M-1 0.8 L-6.5 5.6" />
    <circle className="scissors-loader__handle" cx="-10.6" cy="8.6" r="4.4" />
    <path className="scissors-loader__blade" d="M-1.5 -1.4 C7 -2.8 15 -2.3 24 -0.3 C16 0.9 7 1.2 -1.5 1.3 Z" />
  </>
);

/**
 * Page/section loading indicator: tailor's scissors cutting a dashed circle, in the brand colour.
 * Too small to read inside buttons — keep react-bootstrap's `<Spinner size="sm">` there.
 */
const ScissorsLoader: React.FC<{ size?: number; className?: string }> = ({ size = 72, className }) => {
  const { t } = useTranslation();
  // useId() contains characters (":", "«") that break a url(#…) reference.
  const maskId = `scissors-cut-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <span
      className={`scissors-loader${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={t('common.loading')}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <path className="scissors-loader__reveal" pathLength={100} d={CUT_PATH} />
        </mask>
        <circle className="scissors-loader__guide" cx="50" cy="50" r="34" />
        <path className="scissors-loader__cut" pathLength={100} d={CUT_PATH} mask={`url(#${maskId})`} />
        <g className="scissors-loader__orbit">
          <g transform="translate(50 16) rotate(8) scale(0.95)">
            <g className="scissors-loader__blade-b"><g transform="scale(1 -1)"><Half /></g></g>
            <g className="scissors-loader__blade-a"><Half /></g>
            <circle className="scissors-loader__screw" r="1.8" />
          </g>
        </g>
      </svg>
    </span>
  );
};

export default ScissorsLoader;
