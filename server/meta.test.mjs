import { describe, it, expect } from 'vitest';
import { buildMeta, injectMeta, cleanText } from './meta.mjs';

const site = { siteName: 'Tejidos Pulido', siteDescription: 'Tu tienda de tejidos de confianza.', logoUrl: 'https://cdn/logo.png' };
const api = (routes) => async (path) => (path === '/storefront/site-settings' ? site : routes[path] ?? null);

describe('share preview meta', () => {
  it('uses the variant name, description and first photo on a variant page', async () => {
    const meta = await buildMeta('/variant/42', api({
      '/storefront/products/variants/42': { name: 'Cretona lisa 1019 cardinal', description: 'Algodón **100%**', images: [{ url: 'https://cdn/v42.jpg' }] },
    }));
    expect(meta).toMatchObject({ title: 'Cretona lisa 1019 cardinal — Tejidos Pulido', description: 'Algodón 100%', image: 'https://cdn/v42.jpg', type: 'product' });
  });

  it('uses the page name and image on a category slug', async () => {
    const meta = await buildMeta('/patchwork', api({
      '/storefront/pages/patchwork?pageSize=1': { name: 'Patchwork', description: '<p>Telas de <strong>patchwork</strong></p>', imageUrl: 'https://cdn/p.webp' },
    }));
    expect(meta).toMatchObject({ title: 'Patchwork — Tejidos Pulido', description: 'Telas de patchwork', image: 'https://cdn/p.webp' });
  });

  it('falls back to the shop itself for the home, app screens and unknown items', async () => {
    const home = await buildMeta('/', api({}));
    expect(home).toMatchObject({ title: 'Tejidos Pulido', description: 'Tu tienda de tejidos de confianza.', image: 'https://cdn/logo.png' });
    expect((await buildMeta('/cart', api({}))).title).toBe('Tejidos Pulido');
    expect((await buildMeta('/variant/999', api({}))).title).toBe('Tejidos Pulido');
  });

  it('writes escaped tags into index.html, replacing the static title and description', () => {
    const html = '<head><title>TXT Shop</title>\n<meta name="description" content="x" /></head>';
    const out = injectMeta(html, { siteName: 'A&B', title: 'Tela "roja" <b>', description: 'd', image: 'https://cdn/i.jpg', type: 'product' }, 'https://shop/variant/1');

    expect(out).toContain('<title>Tela &quot;roja&quot; &lt;b&gt;</title>');
    expect(out).toContain('<meta property="og:image" content="https://cdn/i.jpg" />');
    expect(out).toContain('<meta property="og:url" content="https://shop/variant/1" />');
    expect(out).toContain('<meta property="og:site_name" content="A&amp;B" />');
    expect(out).not.toContain('TXT Shop');
    expect(out.match(/name="description"/g)).toHaveLength(1);
  });

  it('cuts long descriptions on one line', () => {
    expect(cleanText('a\n\n' + 'x'.repeat(300))).toHaveLength(200);
  });

  // Audit 2026-10-08: "$'" / "$&" in a CMS title were replacement patterns and spliced index.html in.
  it('writes a title with $ patterns literally', () => {
    const html = '<head><title>TXT Shop</title>\n<meta name="description" content="x" /></head><body><script src="/a.js"></script></body>';
    const out = injectMeta(html, { siteName: 'S', title: "Oferta 2x1 $' y $&", description: "desc $'", type: 'website', image: null }, null);
    expect(out).toMatch(/<title>Oferta 2x1 \$(&#39;|') y \$&amp;<\/title>/);
    expect(out.match(/<script/g)).toHaveLength(1);
  });

  it('does not throw on a malformed percent-escape in the path', async () => {
    const meta = await buildMeta('/guia-de-tejidos%E0', api({}));
    expect(meta.title).toBe('Tejidos Pulido');
  });
});
