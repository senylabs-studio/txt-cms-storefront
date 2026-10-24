import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // This app fetches data with axios inside useEffect + setState (no React
      // Query/SWR) — that's the standard "synchronize with an external system"
      // effect the rule itself allows for, but it still flags the setState
      // call, so keep it a warning rather than a hard error here.
      'react-hooks/set-state-in-effect': 'warn',
      // Purely a dev-mode HMR nicety (a changed context file triggers a full
      // page reload instead of hot-swapping) — no correctness or production
      // impact. Fixing it means splitting every Provider+hook context file
      // into two, which was assessed and deliberately deferred; keep it from
      // blocking CI in the meantime.
      'react-refresh/only-export-components': 'warn',
      // The browser's own dialogs are unstyled, untranslated and look like a scam on a shop:
      // ask in a react-bootstrap Modal (see AccountPage's delete-account dialog), tell in a toast.
      'no-restricted-globals': ['error',
        { name: 'confirm', message: 'Ask in a Modal (see AccountPage).' },
        { name: 'alert', message: 'Show a toast or an inline Alert.' },
        { name: 'prompt', message: 'Ask in a Modal with a field.' },
      ],
      'no-restricted-properties': ['error',
        { object: 'window', property: 'confirm', message: 'Ask in a Modal (see AccountPage).' },
        { object: 'window', property: 'alert', message: 'Show a toast or an inline Alert.' },
        { object: 'window', property: 'prompt', message: 'Ask in a Modal with a field.' },
      ],
    },
  },
  {
    // Context files export their Provider plus the matching use* hook by design (splitting them
    // was deferred, see above) — every warning here was that same known, dev-only HMR case, so it
    // stays on for components elsewhere without drowning real warnings in noise.
    files: ['src/contexts/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
