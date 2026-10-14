import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import './CookieBanner.css';

import { OPEN_COOKIE_SETTINGS_EVENT as OPEN_EVENT } from './cookieSettings';

const CookieBanner: React.FC = () => {
  const { t } = useTranslation();
  const { prefs, acceptAll, rejectAll, saveCustom } = useCookieConsent();
  const [showConfig, setShowConfig] = useState(false);
  const [reopened, setReopened] = useState(false);
  // Off until the visitor turns them on: pre-ticked boxes aren't consent (audit 2026-10-14).
  const [analytics, setAnalytics] = useState(false);
  const [personalization, setPersonalization] = useState(false);

  useEffect(() => {
    const open = () => {
      setAnalytics(prefs?.analytics ?? false);
      setPersonalization(prefs?.personalization ?? false);
      setShowConfig(true);
      setReopened(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, [prefs]);

  // Already chosen — nothing to show unless asked for again.
  if (prefs !== null && !reopened) return null;

  const close = () => { setReopened(false); setShowConfig(false); };
  const handleSave = () => { saveCustom({ analytics, personalization }); close(); };
  const handleRejectAll = () => { rejectAll(); close(); };
  const handleAcceptAll = () => { acceptAll(); close(); };

  return (
    <div className="cookie-banner" role="region" aria-label={t('cookies.bannerLabel')}>
      {!showConfig ? (
        <div className="cookie-bar">
          <p className="cookie-bar-text">
            {t('cookies.bannerText')}{' '}
            <a href="/politica-de-cookies">{t('cookies.learnMore')}</a>
          </p>
          <div className="cookie-bar-actions">
            <button className="btn btn-outline-secondary btn-sm" onClick={handleRejectAll}>
              {t('cookies.rejectAll')}
            </button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowConfig(true)}>
              {t('cookies.configure')}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleAcceptAll}>
              {t('cookies.acceptAll')}
            </button>
          </div>
        </div>
      ) : (
        <div className="cookie-config">
          <h6 className="cookie-config-title">{t('cookies.configTitle')}</h6>

          {/* Technical — always active */}
          <div className="cookie-cat">
            <div className="cookie-cat-info">
              <span className="cookie-cat-name">{t('cookies.technical')}</span>
              <span className="cookie-cat-desc">{t('cookies.technicalDesc')}</span>
            </div>
            <span className="cookie-cat-always">{t('cookies.alwaysActive')}</span>
          </div>

          {/* Analytics */}
          <div className="cookie-cat">
            <div className="cookie-cat-info">
              <span className="cookie-cat-name">{t('cookies.analytics')}</span>
              <span className="cookie-cat-desc">{t('cookies.analyticsDesc')}</span>
            </div>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={analytics}
                onChange={e => setAnalytics(e.target.checked)}
              />
            </div>
          </div>

          {/* Personalization */}
          <div className="cookie-cat">
            <div className="cookie-cat-info">
              <span className="cookie-cat-name">{t('cookies.personalization')}</span>
              <span className="cookie-cat-desc">{t('cookies.personalizationDesc')}</span>
            </div>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={personalization}
                onChange={e => setPersonalization(e.target.checked)}
              />
            </div>
          </div>

          <div className="cookie-config-footer">
            <button className="btn btn-outline-secondary btn-sm" onClick={handleRejectAll}>
              {t('cookies.rejectAll')}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              {t('cookies.savePreferences')}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleAcceptAll}>
              {t('cookies.acceptAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookieBanner;
