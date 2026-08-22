import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { getMenu } from '../../../services/pageService';
import type { StorefrontMenuItem } from '../../../types';
import { pageUrl } from '../../../utils/pageUrl';

const LANGS = ['es', 'ca', 'en'] as const;

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

  useEffect(() => {
    getMenu().then(setItems).catch(() => {});
  }, [i18n.language]);

  if (!open) return null;

  const changeLang = (lng: string) => i18n.changeLanguage(lng);

  return (
    <div className="mobile-menu-backdrop" onClick={onClose}>
      <div className="mobile-menu-sheet" onClick={e => e.stopPropagation()}>
        <div className="mobile-menu-handle" />

        <div className="mobile-menu-list">
          {items.map(item => (
            item.externalUrl ? (
              <a key={item.id} href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="mobile-menu-item" onClick={onClose}>
                <span>{item.name}</span>
                <FaChevronRight size={14} />
              </a>
            ) : (
              <Link key={item.id} to={resolveHref(item)} className="mobile-menu-item" onClick={onClose}>
                <span>{item.name}</span>
                <FaChevronRight size={14} />
              </Link>
            )
          ))}
        </div>

        <div className="mobile-menu-footer">
          <div className="mobile-menu-langs">
            {LANGS.map((lng, i) => (
              <React.Fragment key={lng}>
                {i > 0 && <span className="mobile-menu-lang-sep">·</span>}
                <button
                  className={`mobile-menu-lang${i18n.language === lng ? ' is-active' : ''}`}
                  onClick={() => changeLang(lng)}
                >
                  {t(`lang.${lng}`)}
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
