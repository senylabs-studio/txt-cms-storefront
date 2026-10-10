// Storefront web server (Azure: startup command `node /home/site/wwwroot/server.mjs`).
// Serves the built site from ./dist like `pm2 serve --spa` did, but every page (index.html) goes
// out with its own title/description/image for share previews — see meta.mjs.
// No dependencies: plain Node 22.

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMeta, injectMeta, safeDecode, createJsonCache, NOT_FOUND, isLocalPath, requestHost } from './meta.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// Deployed next to dist/ (Azure package root); in the repo it lives in server/, beside ../dist.
const DIST = resolve(here, existsSync(join(here, 'dist')) ? 'dist' : '../dist');
const PORT = Number(process.env.PORT) || 8080;
const config = JSON.parse(await readFile(join(DIST, 'server-config.json'), 'utf8').catch(() => '{}'));
// API_URL (app setting) wins; else the VITE_API_URL the site was built with.
const API_URL = (process.env.API_URL || config.apiUrl || '').replace(/\/$/, '');
const indexHtml = await readFile(join(DIST, 'index.html'), 'utf8');
// The shop's real host (app setting, e.g. www.tejidospulido.com): requests on any other host (the
// azurewebsites address, the bare domain) get a 301 there — one origin for sessions and carts,
// one copy for search engines. Unset (test environment): no redirect.
const CANONICAL_HOST = (process.env.CANONICAL_HOST || '').trim().toLowerCase();
const API_ORIGIN = API_URL ? new URL(API_URL).origin : '';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

// API answers cached a few minutes: a shared link is often opened by many crawlers/people at once.
const getJson = createJsonCache(async (path) => {
  if (!API_URL) return null;
  const res = await fetch(API_URL + path, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } });
  if (res.ok) return res.json();
  return res.status === 404 ? NOT_FOUND : null;
});
// The shop's name and logo are in every preview: fetched at start and kept fresh, so a preview
// asked while the API is waking up still has them.
const refreshSite = () => getJson('/storefront/site-settings', { refresh: true }).catch(() => {});
refreshSite();
setInterval(refreshSite, 4 * 60 * 1000).unref();

async function sendFile(res, file) {
  const body = await readFile(file);
  const hashedAsset = file.startsWith(join(DIST, 'assets') + '/');
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': hashedAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
  });
  res.end(body);
}

// Audit 2026-10-08: no one may frame the shop (clickjacking), sniff files as another type or
// read full URLs (reset links) from the Referer. A full script CSP is left out on purpose: the
// PayPal SDK loads its scripts dynamically.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// 301 (cached an hour) only for a known answer; a temporary one (302, not cached) when the API
// couldn't be asked — browsers and search engines would otherwise keep "moved to the home page".
const redirect = (res, location, permanent = true) => {
  res.writeHead(permanent ? 301 : 302, { ...SECURITY_HEADERS, Location: location, 'Cache-Control': permanent ? 'public, max-age=3600' : 'no-store' });
  res.end();
};



// robots.txt: the sitemap on this host (below), and the private screens kept out of the index.
const robotsTxt = (origin) => [
  'User-agent: *',
  'Disallow: /account', 'Disallow: /checkout', 'Disallow: /cart', 'Disallow: /board', 'Disallow: /favorites',
  'Disallow: /login', 'Disallow: /register', 'Disallow: /forgot-password', 'Disallow: /reset-password', 'Disallow: /guest-access',
  'Allow: /',
  '',
  `Sitemap: ${origin}/sitemap.xml`,
  '',
].join('\n');

let sitemapCache = { body: null, until: 0 };
async function sitemapXml() {
  if (sitemapCache.body && sitemapCache.until > Date.now()) return sitemapCache.body;
  try {
    const r = await fetch(`${API_ORIGIN}/sitemap.xml`, { signal: AbortSignal.timeout(10000) });
    if (r.ok) sitemapCache = { body: await r.text(), until: Date.now() + 60 * 60 * 1000 };
  } catch { /* keep the last good copy */ }
  return sitemapCache.body;
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const host = requestHost(req.headers);
    if (CANONICAL_HOST && host && host !== CANONICAL_HOST)
      return redirect(res, `https://${CANONICAL_HOST}${url.pathname}${url.search}`);
    const origin = `https://${CANONICAL_HOST || host}`;

    if (url.pathname === '/robots.txt') {
      // Cached only when the host is the configured one, not whatever the request said.
      res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': TYPES['.txt'], 'Cache-Control': CANONICAL_HOST ? 'public, max-age=3600' : 'no-cache' });
      return res.end(robotsTxt(origin));
    }
    // Served from the shop's own host: a sitemap on the API's host only counts if both hosts
    // are verified in Search Console.
    if (url.pathname === '/sitemap.xml') {
      const xml = await sitemapXml();
      if (!xml) { res.writeHead(503, SECURITY_HEADERS); return res.end(); }
      res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': TYPES['.xml'], 'Cache-Control': 'public, max-age=3600' });
      return res.end(xml);
    }
    // Old shop (ePages) links: /epages/<shop>.sf/<lang>/?ObjectPath=/Shops/<id>/… → where it lives now.
    if (url.pathname.startsWith('/epages/')) {
      const objectPath = url.searchParams.get('ObjectPath') || url.searchParams.get('ViewObjectPath') || '';
      const target = objectPath ? await getJson(`/storefront/legacy-redirect?objectPath=${encodeURIComponent(objectPath)}`) : NOT_FOUND;
      if (target === null) return redirect(res, '/', false); // API asleep or failing: try again later
      return redirect(res, target !== NOT_FOUND && isLocalPath(target.path) ? target.path : '/');
    }

    const filePath = normalize(join(DIST, safeDecode(url.pathname)));
    if (filePath.startsWith(DIST + '/') && filePath !== join(DIST, 'index.html')) {
      const info = await stat(filePath).catch(() => null);
      if (info?.isFile()) return await sendFile(res, filePath);
      // A missing hashed asset (old tab after a deploy) is a real 404, not the app.
      if (url.pathname.startsWith('/assets/')) { res.writeHead(404); return res.end(); }
    }
    const meta = await buildMeta(url.pathname, getJson);
    const pageUrl = host || CANONICAL_HOST ? `${origin}${url.pathname}` : null;
    // A page that doesn't exist answers 404 (still the app, which shows its own message).
    res.writeHead(meta.notFound ? 404 : 200, { ...SECURITY_HEADERS, 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : injectMeta(indexHtml, meta, pageUrl));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
}).listen(PORT, () => console.log(`storefront on :${PORT}, API ${API_URL || '(none)'}`));
