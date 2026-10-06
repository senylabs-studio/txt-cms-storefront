// Share previews (WhatsApp, Facebook, Telegram…): their crawlers don't run JavaScript, so they
// only see index.html. This builds the title/description/image of a URL from the API and writes
// them into index.html before it's sent — the same texts the page itself shows once React runs.
// Plain Node, no dependencies (Azure runs it directly, see server.mjs).

const MAX_DESCRIPTION = 200;

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
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);

  try {
    if (segments[0] === 'variant' && /^\d+$/.test(segments[1] ?? '')) {
      const v = await getJson(`/storefront/products/variants/${segments[1]}`);
      if (v) return {
        ...base, type: 'product', title: titled(v.name),
        description: cleanText(v.description) || base.description,
        image: v.images?.[0]?.url || v.thumbnailUrl || base.image,
      };
    } else if (segments[0] === 'product' && segments[1]) {
      const p = await getJson(`/storefront/products/${encodeURIComponent(segments[1])}`);
      if (p) return {
        ...base, type: 'product', title: titled(p.name),
        description: cleanText(p.description) || base.description,
        image: p.imageUrls?.[0] || p.thumbnailUrl || p.variants?.[0]?.thumbnailUrl || base.image,
      };
    } else if (segments.length === 1 && !APP_PATHS.has(segments[0]) || (segments[0] === 'pages' && segments[1])) {
      const slug = segments[0] === 'pages' ? segments[1] : segments[0];
      const page = await getJson(`/storefront/pages/${encodeURIComponent(slug)}?pageSize=1`);
      if (page) return {
        ...base, title: titled(page.name),
        description: cleanText(page.description) || base.description,
        image: page.imageUrl || page.items?.[0]?.thumbnailUrl || base.image,
      };
    }
  } catch {
    // Any lookup problem: the shop's own preview below.
  }
  return base;
}

/** Writes the preview into index.html: replaces <title> and the description, adds og:/twitter: tags. */
export function injectMeta(html, meta, url) {
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.type)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    url ? `<meta property="og:url" content="${escapeHtml(url)}" />` : '',
    meta.image ? `<meta property="og:image" content="${escapeHtml(meta.image)}" />` : '',
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}" />`,
  ].filter(Boolean).join('\n    ');
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, tags);
}
