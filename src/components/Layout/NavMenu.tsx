import React, { useEffect, useRef, useState } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMenu } from '../../services/pageService';
import type { StorefrontMenuItem } from '../../types';
import { pageUrl } from '../../utils/pageUrl';

function resolveHref(item: StorefrontMenuItem): string {
  if (item.externalUrl) return item.externalUrl;
  return pageUrl(item.type, item.slug);
}

const COLS = 4; // max columns in the mega panel

const MegaPanel: React.FC<{ item: StorefrontMenuItem; onClose: () => void }> = ({ item, onClose }) => {
  const { t } = useTranslation();
  const href = resolveHref(item);
  const isExternal = !!item.externalUrl;
  const children = item.children;

  // Split children into columns of max ~6 items each
  const colSize = Math.ceil(children.length / Math.min(COLS, Math.ceil(children.length / 5) || 1));
  const columns: StorefrontMenuItem[][] = [];
  for (let i = 0; i < children.length; i += colSize) {
    columns.push(children.slice(i, i + colSize));
  }

  return (
    <div className="mega-panel">
      <Container>
        <div className="mega-panel-inner">
          <div className="mega-body">
            {/* Left: header + columns */}
            <div className="mega-content">
              <div className="mega-section-header">
                {isExternal ? (
                  <a href={item.externalUrl!} target="_blank" rel="noopener noreferrer" className="mega-section-title">
                    {item.name}
                  </a>
                ) : (
                  <Link to={href} className="mega-section-title" onClick={onClose}>
                    {item.name} — {t('nav.viewAll')}
                  </Link>
                )}
              </div>

              {columns.length > 0 && (
                <div className="mega-columns">
                  {columns.map((col, ci) => (
                    <ul key={ci} className="mega-col">
                      {col.map(child => {
                        const childHref = resolveHref(child);
                        const childExt = !!child.externalUrl;
                        return (
                          <li key={child.id}>
                            {childExt ? (
                              <a href={child.externalUrl!} target="_blank" rel="noopener noreferrer" className="mega-link" onClick={onClose}>
                                {child.name}
                              </a>
                            ) : (
                              <Link to={childHref} className="mega-link" onClick={onClose}>
                                {child.name}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ))}
                </div>
              )}
            </div>

            {/* Right: parent page image */}
            {item.imageUrl && (
              <Link to={href} className="mega-image-wrap" onClick={onClose}>
                <img src={item.imageUrl} alt={item.name} className="mega-image" />
                <span className="mega-image-label">{t('nav.discoverMore')}</span>
              </Link>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

interface NavMenuProps {
  /** Rendered before the nav item list — used for the small logo shown once the
   *  header has collapsed on scroll (desktop/tablet). */
  leading?: React.ReactNode;
  /** Rendered after the nav item list, pushed to the right — the condensed
   *  search field + action icons shown once the header has collapsed on scroll. */
  trailing?: React.ReactNode;
}

const NavMenu: React.FC<NavMenuProps> = ({ leading, trailing }) => {
  const { i18n } = useTranslation();
  const [items, setItems] = useState<StorefrontMenuItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getMenu().then(setItems).catch(() => {});
  }, [i18n.language]);

  const handleEnter = (id: number) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setActiveId(id);
  };

  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setActiveId(null), 120);
  };

  const handleClose = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setActiveId(null);
  };

  // Still render when there are no CMS-configured menu items, as long as the
  // header wants the collapsed-state logo/search/icons slot rendered here.
  if (items.length === 0 && !leading && !trailing) return null;

  const activeItem = items.find(i => i.id === activeId);

  return (
    <nav
      className="nav-menu-bar"
      onMouseLeave={handleLeave}
    >
      {/* Top strip — the actual nav items */}
      <Container>
        <div className="nav-menu-row">
        {leading}
        <ul className="nav-menu-list">
          {items.map(item => {
            const href = resolveHref(item);
            const isExt = !!item.externalUrl;
            const hasChildren = item.children.length > 0;
            const isActive = activeId === item.id;

            return (
              <li
                key={item.id}
                className={`nav-menu-item${isActive ? ' is-active' : ''}`}
                onMouseEnter={() => hasChildren ? handleEnter(item.id) : handleClose()}
              >
                {isExt ? (
                  <a href={item.externalUrl!} target="_blank" rel="noopener noreferrer" className="nav-menu-link">
                    {item.name}
                  </a>
                ) : (
                  <Link to={href} className="nav-menu-link" onClick={handleClose}>
                    {item.name}
                  </Link>
                )}
                {hasChildren && <span className="nav-menu-indicator" />}
              </li>
            );
          })}
        </ul>
        {trailing && <div className="nav-menu-trailing">{trailing}</div>}
        </div>
      </Container>

      {/* Mega panel */}
      {activeItem && activeItem.children.length > 0 && (
        <div onMouseEnter={() => handleEnter(activeItem.id)}>
          <MegaPanel item={activeItem} onClose={handleClose} />
        </div>
      )}
    </nav>
  );
};

export default NavMenu;
