import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SitemapContent from './SitemapContent';
import type { StorefrontMenuItem } from '../../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { getMenu } = vi.hoisted(() => ({ getMenu: vi.fn() }));
vi.mock('../../../services/pageService', () => ({ getMenu }));

const menuItem = (overrides: Partial<StorefrontMenuItem> = {}): StorefrontMenuItem => ({
  id: 1,
  name: 'Externo',
  slug: 'externo',
  type: 'Content',
  order: 0,
  children: [],
  ...overrides,
});

// Regression test: renderLink used to gate on `item.type === 'ExternalLink'`, but PageType has
// no such member (it's Default/Sitemap/PrivacyPolicy/.../Content/Category/CookiePolicy) — so a
// page carrying a real externalUrl override was never rendered as an outbound link here, unlike
// NavMenu/MobileMenuSheet, which correctly check `!!item.externalUrl` regardless of type.
describe('SitemapContent', () => {
  it('renders a standalone page with externalUrl as an outbound link, not an internal route', async () => {
    getMenu.mockResolvedValue([menuItem({ externalUrl: 'https://partner.example.com' })]);
    render(<MemoryRouter><SitemapContent pageName="Mapa del sitio" /></MemoryRouter>);

    const link = await waitFor(() => screen.getByText('Externo').closest('a')!);
    expect(link).toHaveAttribute('href', 'https://partner.example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders a standalone page without externalUrl as a normal internal Link', async () => {
    getMenu.mockResolvedValue([menuItem({ name: 'Interno', slug: 'interno' })]);
    render(<MemoryRouter><SitemapContent pageName="Mapa del sitio" /></MemoryRouter>);

    const link = await waitFor(() => screen.getByText('Interno').closest('a')!);
    expect(link).not.toHaveAttribute('target', '_blank');
    expect(link?.getAttribute('href')).not.toBe('https://partner.example.com');
  });
});
