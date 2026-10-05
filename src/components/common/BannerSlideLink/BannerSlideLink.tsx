import React from 'react';
import { blockLinkProps } from '../../../utils/blockLinkProps';
import './BannerSlideLink.css';

/**
 * Makes a whole banner slide clickable (phones: people tap the photo, not the small button). An
 * empty anchor stretched over the slide, under its text: the slide's content gets
 * pointer-events: none (see CSS) so taps on the title fall through to it, while its own button
 * stays clickable. When the slide shows that button the anchor is a duplicate of it, so it is
 * hidden from keyboard and screen readers; a link with no button text is only reachable here, so
 * it then carries the slide's title as its label.
 */
const BannerSlideLink: React.FC<{ url?: string; hasButton: boolean; label?: string }> = ({ url, hasButton, label }) => {
  if (!url) return null;
  return hasButton
    ? <a {...blockLinkProps(url)} className="banner-slide-link" tabIndex={-1} aria-hidden="true" />
    : <a {...blockLinkProps(url)} className="banner-slide-link" aria-label={label || url} />;
};

export default BannerSlideLink;
