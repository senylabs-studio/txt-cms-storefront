import { describe, it, expect } from 'vitest';
import { buildMeta, injectMeta, cleanText, createJsonCache, NOT_FOUND, isLocalPath, requestHost, categoryRedirect, legacyAnswer, pickEncoding, canonicalPath, etagFor, isNotModified, requestLanguage, languageAlternates, sitemapWithLanguages } from './meta.mjs';

const site = { siteName: 'Tejidos Pulido', siteDescription: 'Tu tienda de tejidos de confianza.', logoUrl: 'https://cdn/logo.png' };
const api = (routes) => async (path) => (path === '/storefront/site-settings' ? site : routes[path] ?? null);

describe('share preview meta', () => {
  it('uses the variant name, description and first photo on a variant page', async () => {
    const meta = await buildMeta('/variant/42', api({
      '/storefront/products/variants/42/meta': { title: 'Cretona lisa 1019 cardinal', description: 'Algodón **100%**', imageUrl: 'https://cdn/v42.jpg' },
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

  it('preloads the home banner photo when the banner opens the page', async () => {
    const banner = (url) => ({ type: 'Banner', isActive: true, sortOrder: 0, config: { slides: [{ imageUrl: url }, { imageUrl: 'https://cdn/2.webp' }] } });
    const home = await buildMeta('/', api({ '/storefront/home': [banner('https://cdn/hero.webp'), { type: 'FeaturedProducts', sortOrder: 1, config: {} }] }));
    expect(home.preloadImage).toBe('https://cdn/hero.webp');
    // Further down the page it isn't what paints first: no preload.
    const later = await buildMeta('/', api({ '/storefront/home': [{ type: 'Features', sortOrder: 0, config: {} }, { ...banner('https://cdn/hero.webp'), sortOrder: 1 }] }));
    expect(later.preloadImage).toBeUndefined();
    expect((await buildMeta('/', api({}))).preloadImage).toBeUndefined();

    const html = injectMeta('<head><title>x</title>\n<meta name="description" content="x" /></head>', { ...home, preloadImage: 'https://cdn/a.webp?x=1&y=2' }, 'https://shop/');
    expect(html).toContain('<link rel="preload" as="image" href="https://cdn/a.webp?x=1&amp;y=2" fetchpriority="high" />');
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
      '/storefront/products/variants/999/meta': NOT_FOUND,
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
      '/storefront/products/variants/42/meta': { title: 'Cretona </script> lisa', code: '1019-01', description: 'Algodón', price: 11.5, inStock: false, imageUrl: 'https://cdn/v.jpg' },
    }));
    const html = injectMeta('<head><title>x</title>\n<meta name="description" content="x" /></head>', meta, 'https://shop/variant/42');
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1];
    expect(json).not.toContain('</script');
    const ld = JSON.parse(json);
    expect(ld).toMatchObject({ '@type': 'Product', name: 'Cretona </script> lisa', sku: '1019-01', url: 'https://shop/variant/42',
      offers: { '@type': 'Offer', price: '11.50', priceCurrency: 'EUR', availability: 'https://schema.org/OutOfStock', url: 'https://shop/variant/42' } });
  });

  // 2026-10-14: stars and a breadcrumb trail in search results.
  it('adds the rating and a breadcrumb on a variant page with reviews', async () => {
    const meta = await buildMeta('/variant/42', api({
      '/storefront/products/variants/42/meta': { title: 'Cretona lisa Azul', code: 'C1', description: 'x', price: 9, inStock: true,
        productName: 'Cretona lisa', productSlug: 'cretona-lisa', averageRating: 4.666, reviewCount: 3 },
    }));
    const html = injectMeta('<head><title>x</title>\n<meta name="description" content="x" /></head>', meta, 'https://shop/variant/42');
    const [product, crumbs] = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));

    expect(product.aggregateRating).toMatchObject({ '@type': 'AggregateRating', ratingValue: '4.7', reviewCount: 3 });
    expect(crumbs).toMatchObject({ '@type': 'BreadcrumbList', itemListElement: [
      { position: 1, name: 'Tejidos Pulido', item: 'https://shop/' },
      { position: 2, name: 'Cretona lisa', item: 'https://shop/product/cretona-lisa' },
      { position: 3, name: 'Cretona lisa Azul', item: 'https://shop/variant/42' },
    ] });
  });

  it('gives no rating without reviews', async () => {
    const meta = await buildMeta('/variant/42', api({
      '/storefront/products/variants/42/meta': { title: 'T', code: 'C1', description: 'x', price: 9, inStock: true, reviewCount: 0 },
    }));
    expect(meta.jsonLd.aggregateRating).toBeUndefined();
  });

  it('gives the mainland shipping cost and delivery days as shippingDetails', async () => {
    const meta = await buildMeta('/variant/42', api({
      '/storefront/products/variants/42/meta': { title: 'T', code: 'C1', price: 9, inStock: true, reviewCount: 0,
        shippingCost: 5.4, deliveryDaysMin: 2, deliveryDaysMax: 4 },
    }));
    const shipping = meta.jsonLd.offers.shippingDetails;
    expect(shipping).toMatchObject({ '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: '5.40', currency: 'EUR' },
      deliveryTime: { '@type': 'ShippingDeliveryTime', transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 4, unitCode: 'DAY' } } });
    // Mainland only: Baleares (07), Canarias (35, 38), Ceuta (51) and Melilla (52) pay other rates.
    expect(shipping.shippingDestination.addressCountry).toBe('ES');
    expect(shipping.shippingDestination.postalCodeRange).toEqual([
      { postalCodeBegin: '01000', postalCodeEnd: '06999' }, { postalCodeBegin: '08000', postalCodeEnd: '34999' },
      { postalCodeBegin: '36000', postalCodeEnd: '37999' }, { postalCodeBegin: '39000', postalCodeEnd: '50999' },
    ]);

    const free = await buildMeta('/variant/42', api({
      '/storefront/products/variants/42/meta': { title: 'T', code: 'C1', price: 90, inStock: true, shippingCost: 0 },
    }));
    expect(free.jsonLd.offers.shippingDetails.shippingRate.value).toBe('0.00');
    expect(free.jsonLd.offers.shippingDetails.deliveryTime).toBeUndefined();

    const unknown = await buildMeta('/variant/42', api({
      '/storefront/products/variants/42/meta': { title: 'T', code: 'C1', price: 9, inStock: true, shippingCost: null },
    }));
    expect(unknown.jsonLd.offers.shippingDetails).toBeUndefined();
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

describe('API cache for previews', () => {
  it('serves the last good answer while the API is down, and retries later', async () => {
    let t = 0;
    let answer = { siteName: 'Tejidos Pulido' };
    let calls = 0;
    const get = createJsonCache(async () => { calls++; if (answer instanceof Error) throw answer; return answer; }, { now: () => t });

    expect(await get('/s')).toEqual({ siteName: 'Tejidos Pulido' });
    t += 10 * 60 * 1000;                     // stale
    answer = new Error('timeout');           // API waking up
    expect(await get('/s')).toEqual({ siteName: 'Tejidos Pulido' });
    expect(await get('/s')).toEqual({ siteName: 'Tejidos Pulido' }); // within the retry window: no new call
    expect(calls).toBe(2);
    t += 31 * 1000;
    answer = { siteName: 'Nuevo' };
    expect(await get('/s')).toEqual({ siteName: 'Nuevo' });
  });

  // Plain insertion order evicted the site settings (the first key) once a crawler walked the
  // sitemap: the generic "Tienda" preview came back while the API was asleep.
  it('evicts the least recently used entry, not the oldest one', async () => {
    const get = createJsonCache(async (p) => ({ p }), { max: 2 });
    await get('/site');
    await get('/a');
    await get('/site');            // used again
    await get('/b');               // over the limit: /a goes, /site stays
    let calls = 0;
    const counted = createJsonCache(async (p) => { calls++; return { p }; }, { max: 2 });
    await counted('/site'); await counted('/a'); await counted('/site'); await counted('/b');
    await counted('/site');
    expect(calls).toBe(3);
    expect(await get('/site')).toEqual({ p: '/site' });
  });

  it('shares one API call between simultaneous requests for the same path', async () => {
    let calls = 0;
    const get = createJsonCache(async () => { calls++; await new Promise(r => setTimeout(r, 10)); return { ok: 1 }; });
    await Promise.all([get('/x'), get('/x'), get('/x')]);
    expect(calls).toBe(1);
  });

  it('remembers a 404 and a first failure only as such', async () => {
    const get = createJsonCache(async (p) => (p === '/gone' ? NOT_FOUND : null));
    expect(await get('/gone')).toBe(NOT_FOUND);
    expect(await get('/down')).toBeNull();
  });
});

describe('server helpers', () => {
  // "//evil.com" is protocol-relative to a browser: an open redirect.
  it('only redirects to paths on this site', () => {
    expect(isLocalPath('/variant/12')).toBe(true);
    expect(isLocalPath('//evil.com')).toBe(false);
    expect(isLocalPath('/\\evil.com')).toBe(false);
    expect(isLocalPath('https://evil.com')).toBe(false);
  });

  // The header is the client's: it lands in canonical, og:url and robots.txt.
  it('takes the host header only when it looks like a host name', () => {
    expect(requestHost({ host: 'Tejidospulido.com' })).toBe('tejidospulido.com');
    expect(requestHost({ 'x-forwarded-host': 'shop.test:8443, proxy' })).toBe('shop.test:8443');
    expect(requestHost({ host: 'evil.com/"><script>' })).toBe('');
  });

  // Audit 2026-10-14: categories answered at /pages/x and /x, each its own canonical.
  it('sends /pages/<slug> to /<slug> keeping the query', () => {
    expect(categoryRedirect('/pages/cortinas', '?pagina=2')).toBe('/cortinas?pagina=2');
    expect(categoryRedirect('/pages/cortinas/', '')).toBe('/cortinas');
    expect(categoryRedirect('/pages', '')).toBeNull();
    expect(categoryRedirect('/cortinas', '')).toBeNull();
  });

  // Unknown old links went to the home page: a soft 404 for Google. Gone is 410.
  it('answers an old ePages link with its new place, 410 when gone, and a temporary home when the API is down', () => {
    expect(legacyAnswer('/Shops/x/Products/1', { path: '/variant/5' })).toEqual({ redirect: '/variant/5', permanent: true });
    expect(legacyAnswer('/Shops/x/Products/1', NOT_FOUND)).toEqual({ gone: true });
    expect(legacyAnswer('', undefined)).toEqual({ gone: true }); // ?ObjectID=… links we can't map
    expect(legacyAnswer('/Shops/x/Products/1', null)).toEqual({ redirect: '/', permanent: false });
    expect(legacyAnswer('/Shops/x/Products/1', { path: '//evil.com' })).toEqual({ gone: true });
  });

  it('answers a revalidation of an unchanged file with 304 (translations, favicon…)', () => {
    const etag = etagFor(Buffer.from('{"a":1}'));
    expect(etag).toMatch(/^"[\w-]{16}"$/);
    expect(etagFor(Buffer.from('{"a":1}'))).toBe(etag);
    expect(etagFor(Buffer.from('{"a":2}'))).not.toBe(etag);
    expect(isNotModified(etag, etag)).toBe(true);
    expect(isNotModified(`W/${etag}, "other"`, etag)).toBe(true);
    expect(isNotModified('*', etag)).toBe(true);
    expect(isNotModified('"other"', etag)).toBe(false);
    expect(isNotModified(undefined, etag)).toBe(false);
  });

  it('picks brotli, then gzip, from Accept-Encoding', () => {
    expect(pickEncoding('gzip, deflate, br')).toBe('br');
    expect(pickEncoding('gzip')).toBe('gzip');
    expect(pickEncoding('br;q=0, gzip')).toBe('gzip');
    expect(pickEncoding('')).toBeNull();
    expect(pickEncoding(undefined)).toBeNull();
  });

  // Audit 2026-10-14: /Cortinas/ and /cortinas were each a 200 page with its own canonical.
  it('gives the one form of an app path: no trailing slash, lower case', () => {
    expect(canonicalPath('/Cortinas/')).toBe('/cortinas');
    expect(canonicalPath('/variant/12/')).toBe('/variant/12');
    expect(canonicalPath('/cortinas')).toBeNull();
    expect(canonicalPath('/')).toBeNull();
    expect(canonicalPath('//')).toBe('/');
  });
});

// 2026-10-19: Catalan and English were invisible to search engines (always served in Spanish, no
// alternates). Each language is its own URL (?lng=ca|en) with hreflang links between the three.
describe('languages for search engines', () => {
  it('reads only the other languages from ?lng (Spanish has none)', () => {
    expect(requestLanguage(new URLSearchParams('lng=ca'))).toBe('ca');
    expect(requestLanguage(new URLSearchParams('lng=en&x=1'))).toBe('en');
    expect(requestLanguage(new URLSearchParams('lng=es'))).toBeNull();
    expect(requestLanguage(new URLSearchParams('lng=fr'))).toBeNull();
    expect(requestLanguage(new URLSearchParams(''))).toBeNull();
  });

  it('writes the page language, its own canonical and the hreflang alternates', () => {
    const html = '<!doctype html><html lang="es"><head><title>x</title>\n<meta name="description" content="x" /></head></html>';
    const out = injectMeta(html, { siteName: 'S', title: 'Franel·la', description: 'd', type: 'website', image: null },
      'https://shop/franela?lng=ca', { lang: 'ca', alternates: languageAlternates('https://shop', '/franela') });
    expect(out).toContain('<html lang="ca">');
    expect(out).toContain('<link rel="canonical" href="https://shop/franela?lng=ca" />');
    expect(out).toContain('<link rel="alternate" hreflang="es" href="https://shop/franela" />');
    expect(out).toContain('<link rel="alternate" hreflang="ca" href="https://shop/franela?lng=ca" />');
    expect(out).toContain('<link rel="alternate" hreflang="en" href="https://shop/franela?lng=en" />');
    expect(out).toContain('<link rel="alternate" hreflang="x-default" href="https://shop/franela" />');
  });

  it('gives a missing page no alternates', () => {
    const out = injectMeta('<html lang="es"><title>x</title><meta name="description" content="x" />', { siteName: 'S', title: 'T', description: 'd', type: 'website', notFound: true },
      'https://shop/nope', { alternates: languageAlternates('https://shop', '/nope') });
    expect(out).not.toContain('hreflang');
  });

  it('lists every sitemap page in the three languages, each with all the alternates', () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://shop/franela</loc>\n  </url>\n</urlset>';
    const out = sitemapWithLanguages(xml);
    expect(out).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(out.match(/<url>/g)).toHaveLength(3);
    expect(out).toContain('<loc>https://shop/franela?lng=en</loc>');
    expect(out.match(/hreflang="ca" href="https:\/\/shop\/franela\?lng=ca"/g)).toHaveLength(3);
  });
});
