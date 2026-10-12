import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  FaInstagram, FaFacebook, FaTiktok, FaPinterest,
  FaTwitter, FaYoutube, FaLinkedin,
  FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaClock, FaInfoCircle,
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useSiteSettings, type SiteSettings } from '../../contexts/SiteSettingsContext';
import { usePaymentMethods } from '../../contexts/PaymentMethodsContext';
import { usePartners } from '../../contexts/PartnersContext';
import type { FooterColumn } from '../../services/siteSettingsService';
import { groupOpeningHours, rowLabel } from '../../utils/openingHours';

const SOCIAL: { field: keyof SiteSettings; Icon: React.ElementType; label: string }[] = [
  { field: 'instagramUrl', Icon: FaInstagram, label: 'Instagram' },
  { field: 'facebookUrl', Icon: FaFacebook, label: 'Facebook' },
  { field: 'tikTokUrl', Icon: FaTiktok, label: 'TikTok' },
  { field: 'pinterestUrl', Icon: FaPinterest, label: 'Pinterest' },
  { field: 'twitterUrl', Icon: FaTwitter, label: 'Twitter' },
  { field: 'youtubeUrl', Icon: FaYoutube, label: 'YouTube' },
  { field: 'linkedInUrl', Icon: FaLinkedin, label: 'LinkedIn' },
];

const LEGAL_LINKS = [
  { tKey: 'footer.legalNotice', slug: 'aviso-legal' },
  { tKey: 'footer.terms', slug: 'terminos-condiciones' },
  { tKey: 'footer.privacy', slug: 'proteccion-de-datos' },
  { tKey: 'footer.cookies', slug: 'politica-de-cookies' },
];

/** "937906859" → "937 90 68 59" (Spanish 9-digit numbers); anything else as typed. */
const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 9 ? digits.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4') : phone.trim();
};

/** The shop's address, phone, email and opening hours, straight from the site settings, so the
 *  footer never goes out of date when they change. Lines with no data are left out. The column's
 *  own links (e.g. "¿Quiénes somos?") come first. */
function FooterContact({ links }: { links: FooterColumn['links'] }) {
  const { t, i18n } = useTranslation();
  const { companyAddress, companyPostalCode, companyCity, companyPhone, companyEmail, openingHours } = useSiteSettings();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'es';
  const address = [companyAddress, [companyPostalCode, companyCity].filter(Boolean).join(' ')]
    .map(part => part?.trim()).filter(Boolean).join(', ');
  const hours = openingHours ?? [];

  return (
    <ul className="list-unstyled footer-contact-list">
      {(links ?? []).filter(l => l.text?.trim()).map((l, i) => (
        <li key={`link-${i}`}>
          <FaInfoCircle aria-hidden="true" className="footer-contact-icon" />
          {l.href.startsWith('/') || l.href.startsWith('#')
            ? <Link to={l.href} className="footer-contact-link">{l.text}</Link>
            : l.href
              ? <a href={l.href} target="_blank" rel="noopener noreferrer" className="footer-contact-link">{l.text}</a>
              : <span>{l.text}</span>}
        </li>
      ))}
      {address && (
        <li>
          <FaMapMarkerAlt aria-hidden="true" className="footer-contact-icon" />
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank" rel="noopener noreferrer" className="footer-contact-link">{address}</a>
        </li>
      )}
      {companyPhone?.trim() && (
        <li>
          <FaPhoneAlt aria-hidden="true" className="footer-contact-icon" />
          <a href={`tel:${companyPhone.replace(/[^\d+]/g, '')}`} className="footer-contact-link">{formatPhone(companyPhone)}</a>
        </li>
      )}
      {companyEmail?.trim() && (
        <li>
          <FaEnvelope aria-hidden="true" className="footer-contact-icon" />
          <a href={`mailto:${companyEmail.trim()}`} className="footer-contact-link">{companyEmail.trim()}</a>
        </li>
      )}
      {hours.length > 0 && (
        <li>
          <FaClock aria-hidden="true" className="footer-contact-icon" />
          <span className="footer-contact-hours">
            {groupOpeningHours(hours).map(row => (
              <span key={row.days.join('-')} className="footer-contact-hours-row">
                {rowLabel(row, locale)}:{' '}
                {row.ranges.length > 0
                  ? row.ranges.map(r => `${r.open}–${r.close}`).join(' · ')
                  : t('openingHours.closed')}
              </span>
            ))}
          </span>
        </li>
      )}
    </ul>
  );
}

function FooterColContent({ col }: { col: FooterColumn }) {
  const { t } = useTranslation();
  const paymentMethods = usePaymentMethods();
  const partners = usePartners();

  if (col.type === 'partners') {
    return (
      <div className="footer-logos-list">
        {partners.map(p =>
          p.websiteUrl ? (
            <a key={p.id} href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className="footer-logo-item" title={p.name}>
              {p.logoUrl
                ? <img src={p.logoUrl} alt={p.name} className="footer-logo-img" />
                : <span className="footer-logo-placeholder">{p.name}</span>}
            </a>
          ) : (
            <span key={p.id} className="footer-logo-item" title={p.name}>
              {p.logoUrl
                ? <img src={p.logoUrl} alt={p.name} className="footer-logo-img" />
                : <span className="footer-logo-placeholder">{p.name}</span>}
            </span>
          )
        )}
        {partners.length === 0 && (
          <span className="text-muted small">{t('footer.noPartners')}</span>
        )}
      </div>
    );
  }

  if (col.type === 'paymentMethods') {
    return (
      <div className="footer-logos-list">
        {paymentMethods.map(m => (
          <span key={m.id} className="footer-logo-item" title={m.name}>
            {m.logoUrl
              ? <img src={m.logoUrl} alt={m.name} className="footer-logo-img" />
              : <span className="footer-logo-placeholder">{m.name}</span>}
          </span>
        ))}
        {paymentMethods.length === 0 && (
          <span className="text-muted small">{t('footer.noPaymentMethods')}</span>
        )}
      </div>
    );
  }

  if (col.type === 'logos') {
    return (
      <div className="footer-logos-list">
        {(col.logos ?? []).map((logo, i) =>
          logo.href ? (
            <a key={i} href={logo.href} target="_blank" rel="noopener noreferrer" className="footer-logo-item">
              <img src={logo.imageUrl} alt={logo.alt} className="footer-logo-img" />
            </a>
          ) : (
            <span key={i} className="footer-logo-item">
              <img src={logo.imageUrl} alt={logo.alt} className="footer-logo-img" />
            </span>
          )
        )}
      </div>
    );
  }

  if (col.type === 'contact') return <FooterContact links={col.links} />;

  if (col.type === 'features') {
    return (
      <ul className="list-unstyled footer-features-list">
        {(col.features ?? []).map((feat, i) => (
          <li key={i} className="footer-feature-item">
            {feat.icon && <span className="footer-feature-icon">{feat.icon}</span>}
            <span>{feat.text}</span>
          </li>
        ))}
      </ul>
    );
  }

  // default: links
  return (
    <ul className="list-unstyled footer-col-links">
      {(col.links ?? []).map((lnk, i) => (
        <li key={i}>
          {lnk.href.startsWith('/') || lnk.href.startsWith('#') ? (
            <Link to={lnk.href} className="footer-link">{lnk.text}</Link>
          ) : lnk.href ? (
            <a href={lnk.href} target="_blank" rel="noopener noreferrer" className="footer-link">
              {lnk.text}
            </a>
          ) : (
            <span className="footer-link-plain">{lnk.text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  const activeSocials = SOCIAL.filter(s => settings[s.field]);
  const visibleColumns = settings.footerColumns.filter(c => c.isVisible !== false);
  const copyright = settings.copyright ||
    t('footer.copyright', { year: new Date().getFullYear(), siteName: settings.siteName });

  return (
    <footer className="storefront-footer">
      {/* Top columns */}
      {visibleColumns.length > 0 && (
        <div className="footer-top">
          <Container>
            <Row className="py-4 g-4">
              {visibleColumns.map((col, i) => (
                <Col key={i} xs={12} sm={6} md={4}>
                  <h6 className="footer-col-title">{col.title}</h6>
                  <FooterColContent col={col} />
                </Col>
              ))}
            </Row>
          </Container>
        </div>
      )}

      {/* Bottom bar */}
      <div className="footer-bottom">
        <Container>
          <div className="footer-bottom-inner">
            <div className="footer-legal">
              {LEGAL_LINKS.map((l, i) => (
                <React.Fragment key={l.slug}>
                  <Link to={`/${l.slug}`} className="footer-legal-link">{t(l.tKey)}</Link>
                  {i < LEGAL_LINKS.length - 1 && <span className="footer-legal-sep">·</span>}
                </React.Fragment>
              ))}
            </div>
            {activeSocials.length > 0 && (
              <div className="footer-social">
                {activeSocials.map(({ field, Icon, label }) => (
                  <a
                    key={field}
                    href={settings[field] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-btn"
                    aria-label={label}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            )}
          </div>
          <p className="footer-copyright">{copyright}</p>
        </Container>
      </div>
    </footer>
  );
};

export default Footer;
