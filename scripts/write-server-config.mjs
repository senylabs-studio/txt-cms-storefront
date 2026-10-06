// After `vite build`: tells server/server.mjs which API to ask for share previews — the same
// VITE_API_URL the site was built with (.env.production), so each client's build just works.
import { writeFileSync } from 'node:fs';
import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), 'VITE_');
writeFileSync('dist/server-config.json', JSON.stringify({ apiUrl: env.VITE_API_URL ?? '' }));
