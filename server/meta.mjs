// Share previews (WhatsApp, Facebook, Telegram…): their crawlers don't run JavaScript, so they
// only see index.html. This builds the title/description/image of a URL from the API and writes
// them into index.html before it's sent — the same texts the page itself shows once React runs.
// Plain Node, no dependencies (Azure runs it directly, see server.mjs).

const MAX_DESCRIPTION = 200;

/** What getJson returns when the API answered 404 (as opposed to null: it didn't answer). */
export const NOT_FOUND = Symbol.for('storefront.notFound');

// The storefront's routes (App.tsx) beyond "/<page-slug>": anything else is a real 404, not the
// home page with status 200 (a "soft 404" search engines index as a duplicate).
const KNOWN_TWO = new Set(['account/orders', 'checkout/error', 'checkout/success', 'email/cambio', 'email/confirmar',
  'guest-access/verify', 'newsletter/confirmar']);
const isKnownShape = (segments) =>
  segments.length <= 1
  || (segments.length === 2 && (['pages', 'product', 'variant'].includes(segments[0]) || KNOWN_TWO.has(segments.join('/'))))
  || (segments.length === 3 && segments[0] === 'account' && segments[1] === 'orders');

export const escapeHtml = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** HTML/markdown-ish CMS text → one clean line within what previews show. */
export const cleanText = (s) => {
  const text = String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > MAX_DESCRIPTION ? text.slice(0, MAX_DESCRIPTION - 1).trimEnd() + '…' : text;
};

// Paths that are app screens, not content pages (no API lookup, just the shop's own preview).
const APP_PATHS = new Set([
  'catalog', 'cart', 'tarjeta-regalo', 'login', 'register', 'forgot-password', 'reset-password',
  'guest-access', 'unsubscribe', 'newsletter', 'checkout', 'account', 'favorites', 'board',
]);

/**
 * The preview of a storefront path. `getJson(path)` fetches an API path (relative to the API base)
 * and returns the parsed body, or null when it fails / isn't found.
 */
export async function buildMeta(pathname, getJson) {
  const site = (await getJson('/storefront/site-settings')) ?? {};
  const siteName = site.siteName || 'Tienda';
  const base = {
    siteName,
    title: siteName,
    description: cleanText(site.siteDescription),
    image: site.logoUrl || null,
    type: 'website',
  };
  const titled = (name) => `${name} — ${siteName}`;
  // A malformed %-escape (hand-typed or mangled link) must not throw: keep that segment raw.
  const segments = pathname.split('/').filter(Boolean).map(safeDecode);

  if (!isKnownShape(segments) || (segments[0] === 'variant' && !/^\d+$/.test(segments[1] ?? '')))
    return { ...base, notFound: true };

  try {
    if (segments[0] === 'variant' && /^\d+$/.test(segments[1] ?? '')) {
      const v = await getJson(`/storefront/products/variants/${segments[1]}`);
      if (v === NOT_FOUND) return { ...base, notFound: true };
      if (v) {
        const image = v.images?.[0]?.url || v.thumbnailUrl || base.image;
        return {
          ...base, type: 'product', title: titled(v.name),
          description: cleanText(v.description) || base.description,
          image,
          jsonLd: productLd({ name: v.name, description: cleanText(v.description), image, sku: v.code,
            brand: siteName, price: v.price, inStock: v.availableStock > 0 }),
        };
      }
    } else if (segments[0] === 'product' && segments[1]) {
      const p = await getJson(`/storefront/products/${encodeURIComponent(segments[1])}`);
      if (p === NOT_FOUND) return { ...base, notFound: true };
      if (p) {
        const image = p.imageUrls?.[0] || p.thumbnailUrl || p.variants?.[0]?.thumbnailUrl || base.image;
        const prices = (p.variants?.length ? p.variants : [p]).map(x => x.price).filter(x => typeof x === 'number');
        const inStock = (p.variants?.length ? p.variants : [p]).some(x => x.availableStock > 0);
        return {
          ...base, type: 'product', title: titled(p.name),
          description: cleanText(p.description) || base.description,
          image,
          jsonLd: productLd({ name: p.name, description: cleanText(p.description), image, sku: p.code,
            brand: siteName, price: Math.min(...prices), highPrice: Math.max(...prices), inStock }),
        };
      }
    } else if (segments.length === 1 && !APP_PATHS.has(segments[0]) || (segments[0] === 'pages' && segments[1])) {
      const slug = segments[0] === 'pages' ? segments[1] : segments[0];
      const page = await getJson(`/storefront/pages/${encodeURIComponent(slug)}?pageSize=1`);
      if (page === NOT_FOUND) return { ...base, notFound: true };
      if (page) return {
        ...base, title: titled(page.name),
        description: cleanText(page.description) || base.description,
        image: page.imageUrl || page.items?.[0]?.thumbnailUrl || base.image,
      };
    }
  } catch {
    // Any lookup problem: the shop's own preview below.
  }
  // The home page tells search engines who the shop is (name, logo, address, phone, socials).
  return segments.length === 0 ? { ...base, jsonLd: storeLd(site) } : base;
}

/** schema.org Product for search results (price, availability). Prices are per metre / unit in EUR. */
function productLd({ name, description, image, sku, brand, price, highPrice, inStock }) {
  if (typeof price !== 'number' || !isFinite(price)) return null;
  const availability = `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`;
  const offers = highPrice != null && highPrice > price
    ? { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: price.toFixed(2), highPrice: highPrice.toFixed(2), availability }
    : { '@type': 'Offer', priceCurrency: 'EUR', price: price.toFixed(2), availability };
  return {
    '@context': 'https://schema.org', '@type': 'Product', name,
    ...(description ? { description } : {}), ...(image ? { image: [image] } : {}), ...(sku ? { sku } : {}),
    brand: { '@type': 'Brand', name: brand }, offers,
  };
}

function storeLd(site) {
  if (!site.siteName) return null;
  const sameAs = [site.instagramUrl, site.facebookUrl, site.tikTokUrl, site.pinterestUrl, site.youtubeUrl, site.linkedInUrl, site.twitterUrl].filter(Boolean);
  return {
    '@context': 'https://schema.org', '@type': 'Store', name: site.siteName,
    ...(site.logoUrl ? { logo: site.logoUrl, image: site.logoUrl } : {}),
    ...(site.companyPhone ? { telephone: site.companyPhone } : {}),
    ...(site.companyEmail ? { email: site.companyEmail } : {}),
    ...(site.companyAddress ? { address: {
      '@type': 'PostalAddress', streetAddress: site.companyAddress, addressLocality: site.companyCity,
      postalCode: site.companyPostalCode, addressCountry: 'ES',
    } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** JSON for a <script> block: "<" escaped so CMS text can't close the tag. */
const ldScript = (data, url) => data
  ? `<script type="application/ld+json">${JSON.stringify(url ? { ...data, url, ...(data.offers ? { offers: { ...data.offers, url } } : {}) } : data).replace(/</g, '\\u003c')}</script>`
  : '';

/**
 * Cached API reads for the previews. `load(path)` returns the parsed body, NOT_FOUND, or null
 * (it failed / timed out). Good answers are kept 5 minutes; when the API fails (e.g. waking up
 * from idle) the last good copy is served instead of nothing — the preview used to fall back to a
 * generic "Tienda" (audit 2026-10-09). `{ refresh: true }` ignores the cache's freshness.
 */
export function createJsonCache(load, { ttlMs = 5 * 60 * 1000, retryMs = 30 * 1000, max = 2000, now = Date.now } = {}) {
  const cache = new Map();
  return async (path, { refresh = false } = {}) => {
    const hit = cache.get(path);
    if (!refresh && hit && hit.until > now()) return hit.value;
    let value = null;
    try { value = await load(path); } catch { value = null; }
    if (value === null && hit?.value) {
      cache.set(path, { value: hit.value, until: now() + retryMs });
      return hit.value;
    }
    cache.set(path, { value, until: now() + (value ? ttlMs : retryMs) });
    if (cache.size > max) cache.delete(cache.keys().next().value);
    return value;
  };
}

/** decodeURIComponent that leaves a malformed segment as it is instead of throwing. */
export function safeDecode(segment) {
  try { return decodeURIComponent(segment); } catch { return segment; }
}

/** Writes the preview into index.html: replaces <title> and the description, adds og:/twitter: tags,
 * the canonical URL, and noindex on a page that doesn't exist. */
export function injectMeta(html, meta, url) {
  const tags = [
    meta.notFound ? '<meta name="robots" content="noindex" />' : '',
    url && !meta.notFound ? `<link rel="canonical" href="${escapeHtml(url)}" />` : '',
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.type)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    url ? `<meta property="og:url" content="${escapeHtml(url)}" />` : '',
    meta.image ? `<meta property="og:image" content="${escapeHtml(meta.image)}" />` : '',
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}" />`,
    meta.notFound ? '' : ldScript(meta.jsonLd, url),
  ].filter(Boolean).join('\n    ');
  // Replacer functions, not strings: a "$'" or "$&" in a CMS title is a replacement pattern in a
  // string and used to splice parts of index.html into the <title> (audit 2026-10-08).
  return html
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, () => tags);
}
