import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spinner } from 'react-bootstrap';
import { getMenu } from '../../../services/pageService';
import type { StorefrontMenuItem } from '../../../types';
import { pageUrl } from '../../../utils/pageUrl';
import './SitemapPage.css';

interface Props {
  pageName: string;
}

const SitemapContent: React.FC<Props> = ({ pageName }) => {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<StorefrontMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMenu()
      .then(setMenu)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="text-center py-5">
      <Spinner animation="border" variant="primary" />
    </div>
  );

  const renderLink = (item: StorefrontMenuItem, className = 'sitemap-link') => {
    // externalUrl is an override independent of Type (NavMenu/MobileMenuSheet honor it the same
    // way) — PageType has no "ExternalLink" member, so gating on item.type here could never
    // actually match, leaving this branch permanently unreachable.
    if (item.externalUrl) {
      return (
        <a
          key={item.id}
          href={item.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {item.name}
          <span className="sitemap-external-icon">↗</span>
        </a>
      );
    }
    return (
      <Link key={item.id} to={pageUrl(item.type, item.slug)} className={className}>
        {item.name}
      </Link>
    );
  };

  const categories = menu.filter(item => item.children?.length > 0);
  const standalone = menu.filter(item => (!item.children || item.children.length === 0) && item.type !== 'Default');

  return (
    <div className="page-content sitemap-content">
      <h1 className="page-content-title">{pageName}</h1>

      {categories.length > 0 && (
        <div className="sitemap-grid">
          {categories.map(cat => (
            <div key={cat.id} className="sitemap-section">
              {renderLink(cat, 'sitemap-section-title')}
              <ul className="sitemap-links">
                {cat.children.map(child => (
                  <li key={child.id}>
                    {renderLink(child)}
                    {child.children?.length > 0 && (
                      <ul className="sitemap-links sitemap-links--nested">
                        {child.children.map(sub => (
                          <li key={sub.id}>{renderLink(sub)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {standalone.length > 0 && (
        <div className="sitemap-standalone">
          <p className="sitemap-standalone-title">{t('sitemap.pages')}</p>
          <ul className="sitemap-links sitemap-links--inline">
            {standalone.map(item => (
              <li key={item.id}>{renderLink(item)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SitemapContent;
