import { useSyncExternalStore } from 'react';

// Whether a CSS media query matches, kept up to date as the window resizes or rotates. False
// where matchMedia doesn't exist (jsdom), i.e. the desktop layout.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      const mql = window.matchMedia?.(query);
      if (!mql) return () => {};
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
