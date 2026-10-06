// Storefront web server (Azure: startup command `node /home/site/wwwroot/server.mjs`).
// Serves the built site from ./dist like `pm2 serve --spa` did, but every page (index.html) goes
// out with its own title/description/image for share previews — see meta.mjs.
// No dependencies: plain Node 22.

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMeta, injectMeta } from './meta.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// Deployed next to dist/ (Azure package root); in the repo it lives in server/, beside ../dist.
const DIST = resolve(here, existsSync(join(here, 'dist')) ? 'dist' : '../dist');
const PORT = Number(process.env.PORT) || 8080;
const config = JSON.parse(await readFile(join(DIST, 'server-config.json'), 'utf8').catch(() => '{}'));
// API_URL (app setting) wins; else the VITE_API_URL the site was built with.
const API_URL = (process.env.API_URL || config.apiUrl || '').replace(/\/$/, '');
const indexHtml = await readFile(join(DIST, 'index.html'), 'utf8');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

// API answers cached a few minutes: a shared link is often opened by many crawlers/people at once.
const cache = new Map();
const CACHE_MS = 5 * 60 * 1000;
async function getJson(path) {
  if (!API_URL) return null;
  const hit = cache.get(path);
  if (hit && hit.until > Date.now()) return hit.value;
  let value = null;
  try {
    const res = await fetch(API_URL + path, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } });
    if (res.ok) value = await res.json();
  } catch {
    value = null;
  }
  // A failure (e.g. the API waking up) is only remembered briefly, so the next request retries.
  cache.set(path, { value, until: Date.now() + (value ? CACHE_MS : 30 * 1000) });
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  return value;
}

async function sendFile(res, file) {
  const body = await readFile(file);
  const hashedAsset = file.startsWith(join(DIST, 'assets') + '/');
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': hashedAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const filePath = normalize(join(DIST, decodeURIComponent(url.pathname)));
    if (filePath.startsWith(DIST + '/') && filePath !== join(DIST, 'index.html')) {
      const info = await stat(filePath).catch(() => null);
      if (info?.isFile()) return await sendFile(res, filePath);
      // A missing hashed asset (old tab after a deploy) is a real 404, not the app.
      if (url.pathname.startsWith('/assets/')) { res.writeHead(404); return res.end(); }
    }
    const meta = await buildMeta(url.pathname, getJson);
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const pageUrl = host ? `https://${host}${url.pathname}` : null;
    res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : injectMeta(indexHtml, meta, pageUrl));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
}).listen(PORT, () => console.log(`storefront on :${PORT}, API ${API_URL || '(none)'}`));
