import { describe, it, expect } from 'vitest';
import { buildMeta, injectMeta, cleanText, NOT_FOUND } from './meta.mjs';

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

  // Pages that don't exist must answer 404 with noindex, not the home page with 200 (a soft 404
  // search engines index as a duplicate). "The API didn't answer" (null) is not "doesn't exist".
  it('marks unknown routes and items the API says don\'t exist as not found', async () => {
    const missing = api({
      '/storefront/products/variants/999': NOT_FOUND,
      '/storefront/pages/no-existe?pageSize=1': NOT_FOUND,
      '/storefront/products/borrado': NOT_FOUND,
    });
    expect((await buildMeta('/variant/999', missing)).notFound).toBe(true);
    expect((await buildMeta('/no-existe', missing)).notFound).toBe(true);
    expect((await buildMeta('/product/borrado', missing)).notFound).toBe(true);
    expect((await buildMeta('/una/ruta/inventada', missing)).notFound).toBe(true);
    expect((await buildMeta('/variant/abc', missing)).notFound).toBe(true);
    // Real routes and an API that didn't answer are not 404s.
    for (const path of ['/', '/cart', '/account/orders/5', '/checkout/success', '/email/confirmar', '/variant/42'])
      expect((await buildMeta(path, missing)).notFound).toBeFalsy();
  });

  it('adds the canonical URL, or noindex for a page that doesn\'t exist', () => {
    const html = '<head><title>x</title>\n<meta name="description" content="x" /></head>';
    const ok = injectMeta(html, { siteName: 'S', title: 'T', description: 'D', type: 'website' }, 'https://www.tejidospulido.com/patchwork');
    expect(ok).toContain('<link rel="canonical" href="https://www.tejidospulido.com/patchwork" />');
    expect(ok).not.toContain('noindex');
    const missing = injectMeta(html, { siteName: 'S', title: 'T', description: 'D', type: 'website', notFound: true }, 'https://www.tejidospulido.com/x');
    expect(missing).toContain('<meta name="robots" content="noindex" />');
    expect(missing).not.toContain('rel="canonical"');
  });

  // Audit 2026-10-09: no structured data for search engines.
  it('adds schema.org Product data with price and availability on a variant page', async () => {
    const meta = await buildMeta('/variant/42', api({
      '/storefront/products/variants/42': { name: 'Cretona </script> lisa', code: '1019-01', description: 'Algodón', price: 11.5, availableStock: 0, images: [{ url: 'https://cdn/v.jpg' }] },
    }));
    const html = injectMeta('<head><title>x</title>\n<meta name="description" content="x" /></head>', meta, 'https://shop/variant/42');
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1];
    expect(json).not.toContain('</script');
    const ld = JSON.parse(json);
    expect(ld).toMatchObject({ '@type': 'Product', name: 'Cretona </script> lisa', sku: '1019-01', url: 'https://shop/variant/42',
      offers: { '@type': 'Offer', price: '11.50', priceCurrency: 'EUR', availability: 'https://schema.org/OutOfStock', url: 'https://shop/variant/42' } });
  });

  it('uses a price range for a product with variants, and the shop (Store) on the home page', async () => {
    const product = await buildMeta('/product/stof', api({
      '/storefront/products/stof': { name: 'Stof', code: '1272', price: 9, variants: [{ price: 9, availableStock: 0 }, { price: 12.5, availableStock: 2 }] },
    }));
    expect(product.jsonLd.offers).toMatchObject({ '@type': 'AggregateOffer', lowPrice: '9.00', highPrice: '12.50', availability: 'https://schema.org/InStock' });

    const home = await buildMeta('/', async (path) => (path === '/storefront/site-settings'
      ? { ...site, companyAddress: 'Calle Montserrat 27', companyCity: 'Mataró', companyPostalCode: '08302', companyPhone: '937906859', instagramUrl: 'https://instagram.com/x' }
      : null));
    expect(home.jsonLd).toMatchObject({ '@type': 'Store', name: 'Tejidos Pulido', telephone: '937906859',
      address: { streetAddress: 'Calle Montserrat 27', postalCode: '08302', addressCountry: 'ES' }, sameAs: ['https://instagram.com/x'] });
    expect((await buildMeta('/cart', api({}))).jsonLd).toBeUndefined();
  });
});
