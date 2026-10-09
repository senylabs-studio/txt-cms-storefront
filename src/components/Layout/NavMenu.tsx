import React, { useEffect, useRef, useState } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMenu } from '../../services/pageService';
import type { StorefrontMenuItem } from '../../types';
import { pageUrl, menuItemClass } from '../../utils/pageUrl';
import MenuItemLabel from './MenuItemLabel';

function resolveHref(item: StorefrontMenuItem): string {
  if (item.externalUrl) return item.externalUrl;
  return pageUrl(item.type, item.slug);
}

const COLS = 5; // max columns in the mega panel (5 keeps big sections like Patchwork short)

const MegaPanel: React.FC<{ item: StorefrontMenuItem; onClose: () => void }> = ({ item, onClose }) => {
  const { t } = useTranslation();
  const href = resolveHref(item);
  const isExternal = !!item.externalUrl;
  const children = item.children;

  // Side image previews the subcategory under the pointer (Zalando-style), falling back to the
  // parent's own image. The last hovered child stays selected when the pointer leaves its link, so
  // the user can move across to the image and click it; hovering the section title resets it.
  // Only the photo under the pointer is fetched, as its small copy: preloading every child's photo
  // on open meant ~29 MB for Patchwork's 61 subcategories.
  const [previewId, setPreviewId] = useState<number | null>(null);
  const preview = children.find(c => c.id === previewId && c.imageUrl) ?? item;
  const previewHref = resolveHref(preview);
  const previewSrc = preview.thumbnailUrl ?? preview.imageUrl;
  const hasAnyImage = !!item.imageUrl || children.some(c => c.imageUrl);

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
              <div className="mega-section-header" onMouseEnter={() => setPreviewId(null)}>
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
                          <li
                            key={child.id}
                            onMouseEnter={() => setPreviewId(child.id)}
                            onFocus={() => setPreviewId(child.id)}
                          >
                            {childExt ? (
                              <a href={child.externalUrl!} target="_blank" rel="noopener noreferrer" className={`mega-link${menuItemClass(child)}`} onClick={onClose}>
                                <MenuItemLabel item={child} />
                              </a>
                            ) : (
                              <Link to={childHref} className={`mega-link${menuItemClass(child)}`} onClick={onClose}>
                                <MenuItemLabel item={child} />
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

            {/* Right: image of the hovered subcategory, or of the parent page */}
            {hasAnyImage && (
              preview.imageUrl ? (
                preview.externalUrl ? (
                  <a href={preview.externalUrl} target="_blank" rel="noopener noreferrer" className="mega-image-wrap" onClick={onClose}>
                    <img src={previewSrc} alt={preview.name} className="mega-image" decoding="async" />
                    <span className="mega-image-label">{t('nav.discoverMore')}</span>
                  </a>
                ) : (
                  <Link to={previewHref} className="mega-image-wrap" onClick={onClose}>
                    <img src={previewSrc} alt={preview.name} className="mega-image" decoding="async" />
                    <span className="mega-image-label">{t('nav.discoverMore')}</span>
                  </Link>
                )
              ) : (
                // Parent has no image but some children do: keep the column's width reserved so
                // the link columns don't jump sideways when a child's image appears.
                <div className="mega-image-wrap" aria-hidden="true" />
              )
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
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<StorefrontMenuItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keyboard: the panel was opened with its toggle button, so focus moves into it.
  const focusPanel = useRef(false);
  const toggleRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!focusPanel.current || activeId == null) return;
    focusPanel.current = false;
    panelRef.current?.querySelector<HTMLElement>('a')?.focus();
  }, [activeId]);

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

  const toggleFromKeyboard = (id: number) => {
    if (activeId === id) { handleClose(); return; }
    focusPanel.current = true;
    handleEnter(id);
  };

  // Escape closes the open panel and puts focus back on its toggle; tabbing out of the menu
  // closes it too (the panel is mouse-hover only otherwise).
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape' || activeId == null) return;
    const id = activeId;
    handleClose();
    toggleRefs.current[id]?.focus();
  };
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (activeId != null && !e.currentTarget.contains(e.relatedTarget as Node | null)) handleClose();
  };

  // Still render when there are no CMS-configured menu items, as long as the
  // header wants the collapsed-state logo/search/icons slot rendered here.
  if (items.length === 0 && !leading && !trailing) return null;

  const activeItem = items.find(i => i.id === activeId);

  return (
    <nav
      className={`nav-menu-bar${leading || trailing ? ' nav-menu-bar--condensed' : ''}`}
      onMouseLeave={handleLeave}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
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
                  <a href={item.externalUrl!} target="_blank" rel="noopener noreferrer" className={`nav-menu-link${menuItemClass(item)}`}>
                    <MenuItemLabel item={item} />
                  </a>
                ) : (
                  <Link to={href} className={`nav-menu-link${menuItemClass(item)}`} onClick={handleClose}>
                    <MenuItemLabel item={item} />
                  </Link>
                )}
                {hasChildren && <span className="nav-menu-indicator" />}
                {hasChildren && (
                  // Only visible when it gets keyboard focus: the mouse opens the panel on hover.
                  <button
                    type="button"
                    ref={el => { toggleRefs.current[item.id] = el; }}
                    className="nav-menu-toggle visually-hidden-focusable"
                    aria-expanded={isActive}
                    aria-controls={`mega-panel-${item.id}`}
                    aria-label={t('nav.openSubmenu', { name: item.name })}
                    onClick={() => toggleFromKeyboard(item.id)}
                  >
                    <span aria-hidden="true">▾</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {trailing && <div className="nav-menu-trailing">{trailing}</div>}
        </div>
      </Container>

      {/* Mega panel */}
      {activeItem && activeItem.children.length > 0 && (
        <div id={`mega-panel-${activeItem.id}`} ref={panelRef} onMouseEnter={() => handleEnter(activeItem.id)}>
          <MegaPanel key={activeItem.id} item={activeItem} onClose={handleClose} />
        </div>
      )}
    </nav>
  );
};

export default NavMenu;
