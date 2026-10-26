/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// The translations' version: a hash of their content. The app asks for /locales/…?v=<it>, so a
// deploy never pairs new code with the old texts a browser kept for a few minutes (a new key
// showed as «product.saving», 2026-10-26); unchanged texts keep the same URL and stay cached.
const localesVersion = createHash('sha256')
  .update(['es', 'ca', 'en'].map(lng => readFileSync(`public/locales/${lng}/translation.json`, 'utf8')).join('\n'))
  .digest('hex').slice(0, 10)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __LOCALES_VERSION__: JSON.stringify(localesVersion) },
  build: {
    rollupOptions: {
      output: {
        // Libraries change far less often than the shop's code: in their own files they stay
        // cached in the browser across deploys.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
          if (/node_modules\/(react-bootstrap|@restart|@popperjs|react-icons)\//.test(id)) return 'ui';
          if (/node_modules\/(i18next|react-i18next)/.test(id)) return 'i18n';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
