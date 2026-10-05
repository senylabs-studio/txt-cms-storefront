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

describe('LandingPage ImageText card', () => {
  it('renders the eyebrow, and tints the card (not the full-width section) with backgroundColor', async () => {
    const block: StorefrontHomeBlock = {
      id: 6, title: 'Pro', type: 'ImageText', isActive: true, sortOrder: 0,
      config: { imageUrl: '/a.jpg', eyebrow: 'Profesionales', title: 'Precios especiales', text: 'Contáctanos', imagePosition: 'left', buttonText: '', buttonUrl: '', backgroundColor: '#b4f9e8' },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    expect(await screen.findByText('Profesionales')).toHaveClass('home-imagetext-eyebrow');
    const card = screen.getByText('Precios especiales').closest('.home-imagetext-card') as HTMLElement;
    expect(card.style.backgroundColor).toBe('rgb(180, 249, 232)');
    // The decorations (scissors cut line, tag hole) take their color from the same background.
    expect(card.style.getPropertyValue('--card-bg')).toBe('#b4f9e8');
    expect((card.closest('.home-imagetext-section')!.parentElement as HTMLElement).style.backgroundColor).toBe('');
  });

  const decorated = (decoration: { pinking?: boolean; cutLine?: boolean; tag?: boolean }): StorefrontHomeBlock => ({
    id: 7, title: 'Regalo', type: 'ImageText', isActive: true, sortOrder: 0,
    config: { imageUrl: '/a.jpg', eyebrow: 'Nuevo', title: 'Tarjetas regalo', text: 'Regala tela', imagePosition: 'left', buttonText: '', buttonUrl: '', decoration },
  });

  it('applies the decorations chosen in the CMS: pinking edge, scissors cut line, hanging tag', async () => {
    getHomeBlocks.mockResolvedValue([decorated({ pinking: true, cutLine: true, tag: true })]);
    const { container } = renderPage();

    const eyebrow = await screen.findByText('Nuevo');
    expect(eyebrow.closest('p')).toHaveClass('is-tag');
    expect(container.querySelector('.home-imagetext-card')).toHaveClass('deco-pinking');
    expect(container.querySelector('.home-imagetext-cutline svg')).not.toBeNull();
  });

  it('without decorations the card stays as it was', async () => {
    getHomeBlocks.mockResolvedValue([decorated({})]);
    const { container } = renderPage();

    expect((await screen.findByText('Nuevo'))).toHaveClass('home-imagetext-eyebrow');
    expect(screen.getByText('Nuevo')).not.toHaveClass('is-tag');
    expect(container.querySelector('.home-imagetext-card')).not.toHaveClass('deco-pinking');
    expect(container.querySelector('.home-imagetext-cutline')).toBeNull();
  });
});

vi.mock('../../contexts/CartContext', () => ({ useCart: () => ({ addItem: vi.fn(), loading: false }) }));
vi.mock('../../contexts/AuthGateContext', () => ({ useAuthGate: () => ({ requireAuth: vi.fn() }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

describe('LandingPage featured products in offers mode', () => {
  const variant = { id: 7, name: 'Cretona azul', price: 8, originalPrice: 10, availableStock: 3 };
  const offersBlock = (config: Partial<Extract<StorefrontHomeBlock, { type: 'FeaturedProducts' }>['config']>): StorefrontHomeBlock => ({
    id: 1, title: 'Ofertas', type: 'FeaturedProducts', isActive: true, sortOrder: 0,
    config: { title: 'Ofertas', source: 'offers', variants: [variant], offersUrl: '/ofertas', ...config },
  });

  it('links to the Ofertas page under the cards, with the default text', async () => {
    getHomeBlocks.mockResolvedValue([offersBlock({})]);
    renderPage();

    const link = await screen.findByText('product.seeAllOffers');
    expect(link).toHaveAttribute('href', '/ofertas');
  });

  // Regression test: an Ofertas page with an external URL came through as a router path, so the
  // button pointed at "/https://…" inside the shop.
  it('opens an external Ofertas URL as an external link', async () => {
    getHomeBlocks.mockResolvedValue([offersBlock({ offersUrl: 'https://rebajas.example.com' })]);
    renderPage();

    const link = await screen.findByText('product.seeAllOffers');
    expect(link).toHaveAttribute('href', 'https://rebajas.example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('uses the link text written in the CMS', async () => {
    getHomeBlocks.mockResolvedValue([offersBlock({ buttonText: 'Todas las rebajas' })]);
    renderPage();

    expect(await screen.findByText('Todas las rebajas')).toHaveAttribute('href', '/ofertas');
  });

  it('shows neither cards nor link when nothing is on sale', async () => {
    getHomeBlocks.mockResolvedValue([offersBlock({ variants: [] }), { id: 2, title: 'x', type: 'ImageText', isActive: true, sortOrder: 1, config: { title: 'Después' } }]);
    renderPage();

    await screen.findByText('Después');
    expect(screen.queryByText('Ofertas')).toBeNull();
    expect(screen.queryByText('product.seeAllOffers')).toBeNull();
  });

  it('has no link while the Ofertas page is hidden (no offersUrl)', async () => {
    getHomeBlocks.mockResolvedValue([offersBlock({ offersUrl: null })]);
    renderPage();

    await screen.findByText('Ofertas');
    expect(screen.queryByText('product.seeAllOffers')).toBeNull();
  });
});

describe('LandingPage banner whole-slide link', () => {
  it('stretches the slide link over the photo, hidden from keyboard/readers next to its button', async () => {
    const block: StorefrontHomeBlock = {
      id: 4, title: 'Hero', type: 'Banner', isActive: true, sortOrder: 0,
      config: { slides: [{ imageUrl: '/a.jpg', title: 'Halloween', buttonText: 'Ver telas', buttonUrl: '/halloween' }] },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    const slide = (await screen.findByText('Halloween')).closest('.home-banner') as HTMLElement;
    const cover = slide.querySelector('a.banner-slide-link')!;
    expect(cover).toHaveAttribute('href', '/halloween');
    expect(cover).toHaveAttribute('tabindex', '-1');
    expect(cover).toHaveAttribute('aria-hidden', 'true');
    // The only link screen readers get is the button.
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('labels the slide link with the title when the slide has no button text', async () => {
    const block: StorefrontHomeBlock = {
      id: 5, title: 'Hero', type: 'Banner', isActive: true, sortOrder: 0,
      config: { slides: [{ imageUrl: '/a.jpg', title: 'Navidad', buttonUrl: '/telas-de-navidad' }] },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    const link = await screen.findByRole('link', { name: 'Navidad' });
    expect(link).toHaveAttribute('href', '/telas-de-navidad');
  });

  it('adds no link to a slide without a URL', async () => {
    const block: StorefrontHomeBlock = {
      id: 6, title: 'Hero', type: 'Banner', isActive: true, sortOrder: 0,
      config: { slides: [{ imageUrl: '/a.jpg', title: 'Solo foto' }] },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    await screen.findByText('Solo foto');
    expect(document.querySelector('a.banner-slide-link')).toBeNull();
  });
});

describe('LandingPage features strip', () => {
  it('shows each selling point with its text, the linked ones as links, and skips empty items', async () => {
    const block: StorefrontHomeBlock = {
      id: 7, title: 'Ventajas', type: 'Features', isActive: true, sortOrder: 0,
      config: { items: [
        { id: 'a', icon: 'truck', title: 'Envío gratis', text: 'desde 50 €', linkUrl: '/condiciones-de-envio' },
        { id: 'b', icon: 'lock', title: 'Pago seguro' },
        { id: 'c', icon: 'gift' },
      ] },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    const shipping = await screen.findByText('Envío gratis');
    expect(screen.getByText('desde 50 €')).toBeInTheDocument();
    expect(shipping.closest('a')).toHaveAttribute('href', '/condiciones-de-envio');
    expect(screen.getByText('Pago seguro').closest('a')).toBeNull();
    // The icon-only item (no title, no text) is left out.
    expect(document.querySelectorAll('.home-features-list > li')).toHaveLength(2);
    expect((document.querySelector('.home-features') as HTMLElement).style.getPropertyValue('--home-features-cols')).toBe('2');
  });
});

describe('LandingPage new arrivals block', () => {
  it('links to the catalog filtered to new arrivals, with the default text when none is set', async () => {
    const block: StorefrontHomeBlock = {
      id: 8, title: 'Novedades', type: 'FeaturedProducts', isActive: true, sortOrder: 0,
      config: { title: 'Novedades', source: 'new', variants: [{ id: 1, name: 'Coralina' } as never], products: [] },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    const link = await screen.findByText('product.seeAllNew');
    expect(link.closest('a')).toHaveAttribute('href', '/catalog?novedades=1');
  });
});

describe('LandingPage newsletter block', () => {
  it('shows the sign-up box with the texts from the CMS', async () => {
    const block: StorefrontHomeBlock = {
      id: 9, title: 'Newsletter', type: 'Newsletter', isActive: true, sortOrder: 0,
      config: { title: 'Apúntate', text: 'Ofertas antes que nadie', buttonText: 'Quiero' },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    expect(await screen.findByText('Apúntate')).toBeInTheDocument();
    expect(screen.getByText('Ofertas antes que nadie')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quiero' })).toBeInTheDocument();
  });
});

describe('LandingPage reviews block', () => {
  const review = (i: number) => ({ customerName: `Cliente${i}`, rating: i === 2 ? 4 : 5, comment: `Opinión número ${i} muy buena`, createdAt: '2026-10-05T08:00:00Z', product: { name: `Tela ${i}`, slug: `tela-${i}`, thumbnailUrl: null } });

  it('shows each review with its stars, first name and a link to the fabric', async () => {
    const block: StorefrontHomeBlock = {
      id: 10, title: 'Opiniones', type: 'Reviews', isActive: true, sortOrder: 0,
      config: { reviews: [review(1), review(2), review(3)] },
    };
    getHomeBlocks.mockResolvedValue([block]);
    renderPage();

    expect(await screen.findByText('homeReviews.defaultTitle')).toBeInTheDocument();
    expect(screen.getByText('Opinión número 2 muy buena')).toBeInTheDocument();
    expect(screen.getByText('Cliente2')).toBeInTheDocument();
    expect(screen.getByText('Tela 3').closest('a')).toHaveAttribute('href', '/product/tela-3');
    expect(screen.getAllByRole('img', { name: 'homeReviews.rating' })).toHaveLength(3);
  });

  it('shows nothing while there are no reviews to show', async () => {
    const block: StorefrontHomeBlock = { id: 11, title: 'Opiniones', type: 'Reviews', isActive: true, sortOrder: 0, config: { reviews: [] } };
    getHomeBlocks.mockResolvedValue([block]);
    const { container } = renderPage();
    await new Promise(r => setTimeout(r, 0));
    expect(container.querySelector('.home-reviews')).toBeNull();
  });
});
