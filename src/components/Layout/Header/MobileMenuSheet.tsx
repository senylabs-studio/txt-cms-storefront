import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { getMenu } from '../../../services/pageService';
import { getLanguages, type StorefrontLanguage } from '../../../services/languageService';
import type { StorefrontMenuItem } from '../../../types';
import { pageUrl, menuItemClass } from '../../../utils/pageUrl';
import MenuItemLabel from '../MenuItemLabel';

function resolveHref(item: StorefrontMenuItem): string {
  if (item.externalUrl) return item.externalUrl;
  return pageUrl(item.type, item.slug);
}

interface MobileMenuSheetProps {
  open: boolean;
  onClose: () => void;
}

const MobileMenuSheet: React.FC<MobileMenuSheetProps> = ({ open, onClose }) => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<StorefrontMenuItem[]>([]);
  const [languages, setLanguages] = useState<StorefrontLanguage[]>([]);

  // Loaded when the sheet is first opened (per language), not on every page: the header's own menu
  // already fetches them, and on desktop this sheet is never opened at all.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open || loadedFor.current === i18n.language) return;
    loadedFor.current = i18n.language;
    getMenu().then(setItems).catch(() => {});
    if (languages.length === 0) getLanguages().then(setLanguages).catch(() => {});
  }, [open, i18n.language, languages.length]);

  // The sheet renders inside the sticky header (its own stacking context, z-index 1000), so the
  // floating chat button (1050) would sit on top of the open menu and cover its items.
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('mobile-menu-open');
    return () => document.body.classList.remove('mobile-menu-open');
  }, [open]);

  if (!open) return null;

  const changeLang = (lng: string) => i18n.changeLanguage(lng);

  return (
    <div className="mobile-menu-backdrop" onClick={onClose}>
      <div className="mobile-menu-sheet" onClick={e => e.stopPropagation()}>
        <div className="mobile-menu-handle" />

        <div className="mobile-menu-list">
          {items.map(item => (
            item.externalUrl ? (
              <a key={item.id} href={item.externalUrl} target="_blank" rel="noopener noreferrer" className={`mobile-menu-item${menuItemClass(item)}`} onClick={onClose}>
                <span><MenuItemLabel item={item} /></span>
                <FaChevronRight size={14} />
              </a>
            ) : (
              <Link key={item.id} to={resolveHref(item)} className={`mobile-menu-item${menuItemClass(item)}`} onClick={onClose}>
                <span><MenuItemLabel item={item} /></span>
                <FaChevronRight size={14} />
              </Link>
            )
          ))}
        </div>

        <div className="mobile-menu-footer">
          <div className="mobile-menu-langs">
            {languages.map((lng, i) => (
              <React.Fragment key={lng.code}>
                {i > 0 && <span className="mobile-menu-lang-sep">·</span>}
                <button
                  className={`mobile-menu-lang${i18n.language === lng.code ? ' is-active' : ''}`}
                  onClick={() => changeLang(lng.code)}
                >
                  {t(`lang.${lng.code}`, { defaultValue: lng.code.toUpperCase() })}
                </button>
              </React.Fragment>
            ))}
            <span className="mobile-menu-lang-sep">·</span>
            {isAuthenticated ? (
              <button className="mobile-menu-account" onClick={() => { navigate('/account'); onClose(); }}>
                {t('header.myAccount')}
              </button>
            ) : (
              <>
                <button className="mobile-menu-account" onClick={() => { navigate('/login'); onClose(); }}>
                  {t('header.login')}
                </button>
                <span className="mobile-menu-lang-sep">·</span>
                <button className="mobile-menu-account" onClick={() => { navigate('/register'); onClose(); }}>
                  {t('header.register')}
                </button>
              </>
            )}
          </div>
          {isAuthenticated && (
            <button className="mobile-menu-logout" onClick={() => { logout(); navigate('/'); onClose(); }}>
              {t('header.logout')}
            </button>
          )}
          <button className="mobile-menu-close" onClick={onClose}>{t('header.closeMenu')}</button>
        </div>
      </div>
    </div>
  );
};

export default MobileMenuSheet;
