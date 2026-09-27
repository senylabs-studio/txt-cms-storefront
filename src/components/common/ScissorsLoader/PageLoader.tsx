import React from 'react';
import ScissorsLoader from './ScissorsLoader';

/**
 * Whole-page loading state: the scissors loader centred in the space between header and footer,
 * instead of stuck under the header with a fixed top padding. For a section that loads inside an
 * already-rendered page, keep a plain ScissorsLoader in that section.
 */
const PageLoader: React.FC = () => (
  <div className="page-loader"><ScissorsLoader /></div>
);

export default PageLoader;
