import React, { useEffect, useState } from 'react';
import { Badge, Form, InputGroup, Button, NavDropdown } from 'react-bootstrap';
import { FaShoppingCart, FaUser, FaSearch, FaBars, FaHeart, FaPalette } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import { useFavorites } from '../../../contexts/FavoritesContext';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import NavMenu from '../NavMenu';
import MobileMenuSheet from './MobileMenuSheet';
import './Header.css';

const LANGS = ['es', 'ca', 'en'] as const;
const COLLAPSE_THRESHOLD = 48;

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, name, logout } = useAuth();
  const { itemCount, openDrawer } = useCart();
  const { count: favCount } = useFavorites();
  const { logoUrl, siteName } = useSiteSettings();
  const [search, setSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > COLLAPSE_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/catalog?search=${encodeURIComponent(search.trim())}`);
    setSearch('');
  };

  const changeLang = (lng: string) => i18n.changeLanguage(lng);

  const renderSearchForm = (condensed?: boolean) => (
    <Form className={`header-search ${condensed ? 'header-search--condensed' : ''}`} onSubmit={handleSearch}>
      <InputGroup>
        <Form.Control
          placeholder={condensed ? t('header.searchShort') : t('header.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Button variant="primary" type="submit" aria-label={t('header.search')}><FaSearch /></Button>
      </InputGroup>
    </Form>
  );

  const renderActionIcons = (labeled?: boolean) => (
    <div className={`header-icons ${labeled ? 'header-icons--labeled' : ''}`}>
      {isAuthenticated && (
        <>
          <Link to="/favorites" className="header-icon-btn text-decoration-none" aria-label={t('header.favorites')}>
            <FaHeart size={20} />
            {favCount > 0 && <Badge bg="danger" className="header-icon-badge">{favCount}</Badge>}
            {labeled && <span className="header-icon-label">{t('header.favorites')}</span>}
          </Link>
          <Link to="/board" className="header-icon-btn text-decoration-none" title={t('board.title')} aria-label={t('board.title')}>
            <FaPalette size={20} />
            {labeled && <span className="header-icon-label">{t('board.title')}</span>}
          </Link>
        </>
      )}
      <button className="header-icon-btn" onClick={openDrawer} aria-label={t('header.cart')}>
        <FaShoppingCart size={20} />
        {itemCount > 0 && <Badge bg="success" className="header-icon-badge header-icon-badge--cart">{itemCount}</Badge>}
        {labeled && <span className="header-icon-label">{t('header.cart')}</span>}
      </button>
    </div>
  );

  const brandLogo = (
    <Link to="/" className="brand text-decoration-none">
      {logoUrl
        ? <img src={logoUrl} alt={siteName} className="brand-logo" />
        : <><span className="brand-txt">TXT</span><span className="brand-cms"> Shop</span></>
      }
    </Link>
  );

  const brandMini = (
    <Link to="/" className="brand-mini text-decoration-none">
      {logoUrl
        ? <img src={logoUrl} alt={siteName} className="brand-mini-logo" />
        : <span className="brand-mini-txt">TXT</span>
      }
    </Link>
  );

  return (
    <header className={`storefront-header${scrolled ? ' is-scrolled' : ''}`}>
      {/* Top bar — hidden once scrolled */}
      {!scrolled && (
        <div className="header-topbar">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">{t('header.freeShipping')}</small>
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex gap-1 header-lang-switch">
                  {LANGS.map((lng, i) => (
                    <React.Fragment key={lng}>
                      {i > 0 && <span className="text-muted">·</span>}
                      <button onClick={() => changeLang(lng)} className={`header-lang-btn${i18n.language === lng ? ' is-active' : ''}`}>
                        {t(`lang.${lng}`)}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {isAuthenticated ? (
                  <NavDropdown title={<><FaUser size={13} className="me-1" />{name}</>} align="end" className="topbar-dropdown">
                    <NavDropdown.Item as={Link} to="/account">{t('header.myAccount')}</NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/account/orders">{t('header.myOrders')}</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={() => { logout(); navigate('/'); }}>{t('header.logout')}</NavDropdown.Item>
                  </NavDropdown>
                ) : (
                  <>
                    <Link to="/login" className="topbar-link">{t('header.login')}</Link>
                    <Link to="/register" className="topbar-link">{t('header.register')}</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main brand row — hidden once scrolled */}
      {!scrolled && (
        <div className="header-main">
          <div className="container">
            <div className="header-main-row">
              <button className="header-hamburger" onClick={() => setMenuOpen(true)} aria-label={t('header.menu')}>
                <FaBars size={20} />
              </button>
              {brandLogo}
              {renderSearchForm()}
              {renderActionIcons(true)}
            </div>
          </div>
        </div>
      )}

      {/* Mobile-only search row — always visible below md, folds in the small
          logo + icons + hamburger once the rows above have collapsed on scroll. */}
      <div className="header-mobile-search-row">
        <div className="container">
          <div className="d-flex align-items-center gap-2">
            {scrolled && brandMini}
            {renderSearchForm(true)}
            {scrolled && (
              <>
                {renderActionIcons()}
                <button className="header-hamburger header-hamburger--inline" onClick={() => setMenuOpen(true)} aria-label={t('header.menu')}>
                  <FaBars size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tablet/desktop nav row — always rendered; gains the condensed brand
          logo + search + icons once scrolled, since the rows above hide then. */}
      <NavMenu
        leading={scrolled ? brandMini : undefined}
        trailing={scrolled ? (
          <div className="header-condensed-actions">
            {renderSearchForm(true)}
            {renderActionIcons()}
          </div>
        ) : undefined}
      />

      <MobileMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
};

export default Header;
