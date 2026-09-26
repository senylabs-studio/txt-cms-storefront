import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';
import type { StorefrontHomeBlock } from '../../services/homeService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
  // homeService.ts transitively imports apiClient.ts -> src/i18n.ts, whose module-level
  // `i18n.use(initReactI18next)` would otherwise blow up once this mock replaces the real export.
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('../../components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../contexts/SiteSettingsContext', () => ({
  useSiteSettings: () => ({ siteName: 'TXT Shop', siteDescription: '' }),
}));

const { getHomeBlocks } = vi.hoisted(() => ({ getHomeBlocks: vi.fn() }));
vi.mock('../../services/homeService', async () => {
  const actual = await vi.importActual('../../services/homeService');
  return { ...actual, getHomeBlocks };
});

const renderPage = () => render(<MemoryRouter><LandingPage /></MemoryRouter>);

// Regression tests: Banner/ImageGrid/ImageText blocks used React Router's <Link> for these
// admin-authored URL fields (which may be internal or external), instead of a plain <a href> like
// the equivalent Page-block fields already use (PageBlockRenderer). The installed react-router
// version happens to detect an absolute URL passed to <Link> and skip its own SPA click handler
// for it, so a plain click still worked — but <Link> never sets target="_blank"/rel="noopener
// noreferrer" the way the fixed <a> does (it assumes in-app navigation), and relying on that
// library-internal fallback instead of rendering the correct semantic element (<a href> for
// something that may not even be an in-app route) is what this fixes, matching the codebase's own
// established convention for every other admin-authored link field.
describe('LandingPage external links', () => {
  it('ImageGrid tile link renders as a real <a href> with target=_blank/rel=noopener', async () => {
    const block: StorefrontHomeBlock = {
      id: 1, title: 'Grid', type: 'ImageGrid', isActive: true, sortOrder: 0,
      config: { images: [{ imageUrl: '/img.jpg', caption: 'Ver más', linkUrl: 'https://partner.example.com/tile' }] },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    const img = await screen.findByAltText('Ver más');
    const anchor = img.closest('a')!;
    expect(anchor.tagName).toBe('A');
    expect(anchor).toHaveAttribute('href', 'https://partner.example.com/tile');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('ImageText button renders as a real <a href> with target=_blank/rel=noopener', async () => {
    const block: StorefrontHomeBlock = {
      id: 1, title: 'ImageText', type: 'ImageText', isActive: true, sortOrder: 0,
      config: { title: 'Novedades', buttonText: 'Descubrir', buttonUrl: 'https://partner.example.com/discover' },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    const link = await screen.findByText('Descubrir');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://partner.example.com/discover');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('Banner slide button renders as a real <a href>, matching PageBlockRenderer\'s equivalent field', async () => {
    const block: StorefrontHomeBlock = {
      id: 1, title: 'Banner', type: 'Banner', isActive: true, sortOrder: 0,
      config: { slides: [{ buttonText: 'Saber más', buttonUrl: 'https://partner.example.com/campaign' }] },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    const link = await screen.findByText('Saber más');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://partner.example.com/campaign');
  });
});

describe('LandingPage banner text position', () => {
  it('places the slide text block in the position picked in the CMS', async () => {
    const block: StorefrontHomeBlock = {
      id: 3, title: 'Hero', type: 'Banner', isActive: true, sortOrder: 0,
      config: { slides: [{ imageUrl: '/a.jpg', title: 'Rebajas', textAlign: 'right', textVerticalAlign: 'bottom' }] },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    const slide = (await screen.findByText('Rebajas')).closest('.home-banner') as HTMLElement;
    expect(slide.style.justifyContent).toBe('flex-end');
    expect(slide.style.alignItems).toBe('flex-end');
  });

  it('keeps the historical centered layout for slides saved before positions existed', async () => {
    const block: StorefrontHomeBlock = {
      id: 4, title: 'Hero', type: 'Banner', isActive: true, sortOrder: 0,
      config: { slides: [{ imageUrl: '/a.jpg', title: 'Viejo' }] },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    const slide = (await screen.findByText('Viejo')).closest('.home-banner') as HTMLElement;
    expect(slide.style.justifyContent).toBe('center');
    expect(slide.style.alignItems).toBe('center');
  });
});

describe('LandingPage block links', () => {
  it('opens a site page link (resolved by the backend from a picked page) in the same tab', async () => {
    const block: StorefrontHomeBlock = {
      id: 5, title: 'Pro', type: 'ImageText', isActive: true, sortOrder: 0,
      config: { imageUrl: '/a.jpg', title: 'Precios especiales', text: '', imagePosition: 'left', buttonText: 'Pide presupuesto', buttonUrl: '/contacto', backgroundColor: '' },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    const link = await screen.findByText('Pide presupuesto');
    expect(link).toHaveAttribute('href', '/contacto');
    expect(link).not.toHaveAttribute('target');
  });
});
