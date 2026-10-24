// Share previews (WhatsApp, Facebook, Telegram…): their crawlers don't run JavaScript, so they
// only see index.html. This builds the title/description/image of a URL from the API and writes
// them into index.html before it's sent — the same texts the page itself shows once React runs.
// Plain Node, no dependencies (Azure runs it directly, see server.mjs).
import { createHash } from 'node:crypto';

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
      // The light meta endpoint (a handful of queries, not the ~25 of the full page data):
      // crawlers walk ~5,000 of these URLs. Its title is product + colour, as the cards show.
      const v = await getJson(`/storefront/products/variants/${segments[1]}/meta`);
      if (v === NOT_FOUND) return { ...base, notFound: true };
      if (v) {
        const image = v.imageUrl || base.image;
        return {
          ...base, type: 'product', title: titled(v.title),
          description: cleanText(v.description) || base.description,
          image,
          jsonLd: productLd({ name: v.title, description: cleanText(v.description), image, sku: v.code,
            brand: siteName, price: v.price, inStock: v.inStock, averageRating: v.averageRating, reviewCount: v.reviewCount,
            shipping: shippingLd(v) }),
          // The page's main photo, as it shows it: found only once the app has asked for the variant,
          // it started downloading at 5.7 s on a phone (2026-10-24). Preloaded with the HTML.
          preloadImage: typeof v.displayImageUrl === 'string' && /^https?:\/\//.test(v.displayImageUrl) ? v.displayImageUrl : undefined,
          // Inicio › product › this variant (the results show the trail instead of the URL).
          breadcrumb: v.productSlug ? [
            { name: siteName, path: '/' },
            { name: v.productName, path: `/product/${v.productSlug}` },
            { name: v.title, path: pathname },
          ] : null,
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
  if (segments.length > 0) return base;
  const home = { ...base, jsonLd: storeLd(site) };
  const hero = await homeHeroImage(getJson).catch(() => null);
  return hero ? { ...home, preloadImage: hero } : home;
}

/** The home banner's first photo when the banner opens the page: it paints first (the LCP), but as
 *  a CSS background it's only found once the app has run and asked the API — a preload in the HTML
 *  starts it with the page. */
async function homeHeroImage(getJson) {
  const blocks = await getJson('/storefront/home');
  if (!Array.isArray(blocks)) return null;
  const first = blocks.filter(b => b?.isActive !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
  const url = first?.type === 'Banner' ? first.config?.slides?.[0]?.imageUrl : null;
  return typeof url === 'string' && /^https?:\/\//.test(url) ? url : null;
}

/** schema.org Product for search results (price, availability). Prices are per metre / unit in EUR. */
function productLd({ name, description, image, sku, brand, price, highPrice, inStock, averageRating, reviewCount, shipping }) {
  if (typeof price !== 'number' || !isFinite(price)) return null;
  const availability = `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`;
  const offers = highPrice != null && highPrice > price
    ? { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: price.toFixed(2), highPrice: highPrice.toFixed(2), availability }
    : { '@type': 'Offer', priceCurrency: 'EUR', price: price.toFixed(2), availability, ...(shipping ? { shippingDetails: shipping } : {}) };
  return {
    '@context': 'https://schema.org', '@type': 'Product', name,
    ...(description ? { description } : {}), ...(image ? { image: [image] } : {}), ...(sku ? { sku } : {}),
    brand: { '@type': 'Brand', name: brand }, offers,
    // The stars in search results, from the variant's own reviews.
    ...(reviewCount > 0 && typeof averageRating === 'number'
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: averageRating.toFixed(1), reviewCount, bestRating: '5', worstRating: '1' } }
      : {}),
  };
}

// Mainland Spain by postal code: Baleares (07), Canarias (35, 38), Ceuta (51) and Melilla (52)
// have rates of their own.
const MAINLAND_POSTAL_CODES = [['01000', '06999'], ['08000', '34999'], ['36000', '37999'], ['39000', '50999']]
  .map(([postalCodeBegin, postalCodeEnd]) => ({ postalCodeBegin, postalCodeEnd }));

/** What one unit costs to send to mainland Spain (the API works it out from the checkout rates);
 *  null when it couldn't. */
function shippingLd({ shippingCost, deliveryDaysMin, deliveryDaysMax }) {
  if (typeof shippingCost !== 'number' || !isFinite(shippingCost)) return null;
  const days = Number.isInteger(deliveryDaysMin) && Number.isInteger(deliveryDaysMax);
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: shippingCost.toFixed(2), currency: 'EUR' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'ES', postalCodeRange: MAINLAND_POSTAL_CODES },
    // The rate's estimated days are the whole wait, as checkout shows them: all of it as transit.
    ...(days ? { deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: deliveryDaysMin, maxValue: deliveryDaysMax, unitCode: 'DAY' },
    } } : {}),
  };
}

/** schema.org BreadcrumbList; needs the page URL for absolute links. */
function breadcrumbLd(trail, url) {
  if (!trail?.length || !url) return null;
  const origin = new URL(url).origin;
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({ '@type': 'ListItem', position: i + 1, name: step.name, item: origin + step.path })),
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
      postalCode: site.companyPostalCode, addressCountry: site.companyCountry || 'ES',
    } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** JSON for a <script> block: "<" escaped so CMS text can't close the tag. */
/** The home blocks, in the page itself: the home used to wait for the app to load and then ask the
 *  API before painting anything (the banner image was downloaded at 2.5 s and painted at 10.6 s on
 *  a phone, 2026-10-24). Data, not code (type application/json), tagged with its language: the app
 *  uses it only when it matches the language it opens in. */
export const homeBlocksScript = (blocks, lang) => Array.isArray(blocks)
  ? `<script id="home-blocks" type="application/json" data-lang="${escapeHtml(lang)}">${JSON.stringify(blocks).replace(/</g, '\\u003c')}</script>`
  : '';

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
  const inFlight = new Map();
  // Least recently used goes first: a Map keeps insertion order, so every use re-inserts the key
  // at the end (plain insertion order evicted the site settings — the first key — once a crawler
  // walked the sitemap, bringing back the generic "Tienda" preview).
  const put = (path, entry) => {
    cache.delete(path);
    cache.set(path, entry);
    if (cache.size > max) cache.delete(cache.keys().next().value);
  };
  const fetchAndStore = async (path, hit) => {
    let value = null;
    try { value = await load(path); } catch { value = null; }
    if (value === null && hit?.value) {
      put(path, { value: hit.value, until: now() + retryMs });
      return hit.value;
    }
    put(path, { value, until: now() + (value ? ttlMs : retryMs) });
    return value;
  };
  return async (path, { refresh = false } = {}) => {
    const hit = cache.get(path);
    if (!refresh && hit && hit.until > now()) {
      put(path, hit);
      return hit.value;
    }
    // Several requests for the same page at once (a shared link) share one API call.
    if (inFlight.has(path)) return inFlight.get(path);
    const pending = fetchAndStore(path, hit).finally(() => inFlight.delete(path));
    inFlight.set(path, pending);
    return pending;
  };
}

/** decodeURIComponent that leaves a malformed segment as it is instead of throwing. */
export function safeDecode(segment) {
  try { return decodeURIComponent(segment); } catch { return segment; }
}

// The shop in Catalan and English lives at the same paths with ?lng=ca|en (what i18n reads first),
// so each language is its own URL for search engines; Spanish, the default, has no parameter.
export const ALT_LANGUAGES = ['ca', 'en'];

/** The ?lng= of a request when it's one of the other languages, else null (Spanish). */
export const requestLanguage = (searchParams) => {
  const lng = searchParams.get('lng');
  return ALT_LANGUAGES.includes(lng) ? lng : null;
};

/** The page's URL in a language: Spanish without ?lng, the others with it. */
export const languageUrl = (origin, pathname, lng) => `${origin}${pathname}${lng ? `?lng=${lng}` : ''}`;

/** hreflang alternates for a page: each language's URL, Spanish as x-default. Catalan and English
 * pages were invisible to search engines (only ever served in Spanish, no alternates; 2026-10-19). */
export const languageAlternates = (origin, pathname) => [
  { hreflang: 'es', href: languageUrl(origin, pathname, null) },
  ...ALT_LANGUAGES.map(lng => ({ hreflang: lng, href: languageUrl(origin, pathname, lng) })),
  { hreflang: 'x-default', href: languageUrl(origin, pathname, null) },
];

/** The API's sitemap (Spanish URLs) with every page also listed in Catalan and English, each
 * entry carrying the xhtml:link alternates of all three (Google's sitemap hreflang format). */
export function sitemapWithLanguages(xml) {
  const urlBlocks = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)];
  if (urlBlocks.length === 0) return xml;
  const links = (loc) => ['es', ...ALT_LANGUAGES, 'x-default']
    .map(h => `    <xhtml:link rel="alternate" hreflang="${h}" href="${withLng(loc, h === 'es' || h === 'x-default' ? null : h)}" />`)
    .join('\n');
  const entries = urlBlocks.flatMap(([, loc, rest]) => [null, ...ALT_LANGUAGES].map(lng =>
    `  <url>\n    <loc>${withLng(loc, lng)}</loc>${rest.replace(/\s+$/, '')}\n${links(loc)}\n  </url>`));
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    + entries.join('\n') + '\n</urlset>\n';
}
// A sitemap <loc> is XML-escaped: a query string's & is &amp;.
const withLng = (loc, lng) => (lng ? `${loc}${loc.includes('?') ? '&amp;' : '?'}lng=${lng}` : loc);

/** Writes the preview into index.html: replaces <title> and the description, adds og:/twitter: tags,
 * the canonical URL, the hreflang alternates and the page's language, and noindex on a page that
 * doesn't exist. */
export function injectMeta(html, meta, url, { lang = 'es', alternates = [], homeBlocks = null } = {}) {
  const tags = [
    meta.notFound ? '<meta name="robots" content="noindex" />' : '',
    url && !meta.notFound ? `<link rel="canonical" href="${escapeHtml(url)}" />` : '',
    ...(meta.notFound ? [] : alternates.map(a => `<link rel="alternate" hreflang="${a.hreflang}" href="${escapeHtml(a.href)}" />`)),
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.type)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    url ? `<meta property="og:url" content="${escapeHtml(url)}" />` : '',
    meta.image ? `<meta property="og:image" content="${escapeHtml(meta.image)}" />` : '',
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}" />`,
    meta.notFound ? '' : ldScript(meta.jsonLd, url),
    meta.notFound ? '' : ldScript(breadcrumbLd(meta.breadcrumb, url)),
    meta.preloadImage ? `<link rel="preload" as="image" href="${escapeHtml(meta.preloadImage)}" fetchpriority="high" />` : '',
    homeBlocksScript(homeBlocks, lang),
  ].filter(Boolean).join('\n    ');
  // Replacer functions, not strings: a "$'" or "$&" in a CMS title is a replacement pattern in a
  // string and used to splice parts of index.html into the <title> (audit 2026-10-08).
  return html
    .replace(/<html lang="[^"]*">/, () => `<html lang="${escapeHtml(lang)}">`)
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, () => tags);
}

/** A path on this site: "/x", never "//host" or "/\\host" (protocol-relative to a browser). */
export const isLocalPath = (path) => typeof path === 'string' && path.startsWith('/') && !/^\/[\/\\]/.test(path);

/** The request's host name, only if it looks like one (the header is the client's to set). */
export const requestHost = (headers) => {
  const host = String(headers['x-forwarded-host'] || headers.host || '').split(',')[0].trim().toLowerCase();
  return /^[a-z0-9.-]+(:\d+)?$/.test(host) ? host : '';
};

/**
 * The one form of an app path: no trailing slash, lower case (slugs and routes are lower case;
 * SQL matched /Cortinas/ too, so each spelling was its own 200 page with its own canonical).
 * Null when the path already is it. Not for files (their hashed names are case-sensitive).
 */
export const canonicalPath = (pathname) => {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;
  const lower = trimmed.toLowerCase();
  return lower === pathname ? null : lower;
};

/** /pages/<slug> (the old category URL) → /<slug>, the one every link now uses; else null. */
export const categoryRedirect = (pathname, search) => {
  const m = /^\/pages\/([^/]+)\/?$/.exec(pathname);
  return m ? `/${m[1]}${search || ''}` : null;
};

/**
 * What to answer an old ePages link with, from the API's answer for its ObjectPath: its new
 * place (301); 410 Gone when it has none (sending every unknown link home is a soft 404 for
 * Google); a temporary home (302) when the API didn't answer.
 */
export const legacyAnswer = (objectPath, target) => {
  if (!objectPath || target === NOT_FOUND) return { gone: true };
  if (target == null) return { redirect: '/', permanent: false };
  return isLocalPath(target.path) ? { redirect: target.path, permanent: true } : { gone: true };
};

/** br, else gzip, if the client takes it (q=0 means "not this one"). */
/** Strong validator for a file served with a short max-age (translations, favicon, robots…):
 *  once it expires the browser asks again and gets a bodiless 304 while it hasn't changed. */
export const etagFor = (body) => `"${createHash('sha256').update(body).digest('base64url').slice(0, 16)}"`;

/** If-None-Match against the file's ETag: any listed tag (weak or strong) or "*". */
export const isNotModified = (ifNoneMatch, etag) => {
  if (!ifNoneMatch) return false;
  const tags = String(ifNoneMatch).split(',').map(tag => tag.trim().replace(/^W\//, ''));
  return tags.includes('*') || tags.includes(etag);
};

export const pickEncoding = (acceptEncoding) => {
  const accepted = new Set(String(acceptEncoding ?? '').split(',')
    .map(part => part.trim().split(';'))
    .filter(([, q]) => !q || !/^q=0(\.0*)?$/.test(q.trim()))
    .map(([name]) => name.trim().toLowerCase()));
  return accepted.has('br') ? 'br' : accepted.has('gzip') ? 'gzip' : null;
};
