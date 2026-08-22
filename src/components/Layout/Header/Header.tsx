import React, { useState } from 'react';
import { Navbar, Nav, Container, Badge, Form, InputGroup, Button, NavDropdown } from 'react-bootstrap';
import { FaShoppingCart, FaUser, FaSearch, FaBars, FaHeart, FaPalette } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import { useFavorites } from '../../../contexts/FavoritesContext';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import NavMenu from '../NavMenu';
import './Header.css';

const LANGS = ['es', 'ca', 'en'] as const;

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, name, logout } = useAuth();
  const { itemCount, openDrawer } = useCart();
  const { count: favCount } = useFavorites();
  const { logoUrl, siteName } = useSiteSettings();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/catalog?search=${encodeURIComponent(search.trim())}`);
    setSearch('');
  };

  const changeLang = (lng: string) => i18n.changeLanguage(lng);

  return (
    <header className="storefront-header">
      {/* Top bar */}
      <div className="header-topbar">
        <Container>
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">{t('header.freeShipping')}</small>
            <div className="d-flex align-items-center gap-3">
              {/* Language switcher */}
              <div className="d-flex gap-1" style={{ fontSize: '0.72rem' }}>
                {LANGS.map((lng, i) => (
                  <React.Fragment key={lng}>
                    {i > 0 && <span className="text-muted">·</span>}
                    <button
                      onClick={() => changeLang(lng)}
                      style={{
                        background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer',
                        fontWeight: i18n.language === lng ? 700 : 400,
                        color: i18n.language === lng ? '#212529' : '#6c757d',
                      }}
                    >
                      {t(`lang.${lng}`)}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* User menu */}
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
        </Container>
      </div>

      {/* Main nav */}
      <Navbar expand="lg" className="header-main">
        <Container>
          <Navbar.Brand as={Link} to="/" className="brand">
            {logoUrl
              ? <img src={logoUrl} alt={siteName} className="brand-logo" />
              : <><span className="brand-txt">TXT</span><span className="brand-cms"> Shop</span></>
            }
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="main-nav"><FaBars /></Navbar.Toggle>

          <Navbar.Collapse id="main-nav">
            <Form className="header-search mx-auto" onSubmit={handleSearch}>
              <InputGroup>
                <Form.Control
                  placeholder={t('header.search')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <Button variant="primary" type="submit"><FaSearch /></Button>
              </InputGroup>
            </Form>

            <Nav className="ms-auto align-items-center gap-2">
              {isAuthenticated && (
                <>
                  <Link to="/favorites" className="cart-btn text-decoration-none">
                    <FaHeart size={20} />
                    {favCount > 0 && <Badge bg="danger" className="cart-badge">{favCount}</Badge>}
                  </Link>
                  <Link to="/board" className="cart-btn text-decoration-none" title={t('board.title')}>
                    <FaPalette size={20} />
                  </Link>
                </>
              )}
              <button className="cart-btn" onClick={openDrawer}>
                <FaShoppingCart size={20} />
                {itemCount > 0 && <Badge bg="danger" className="cart-badge">{itemCount}</Badge>}
              </button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <NavMenu />
    </header>
  );
};

export default Header;
