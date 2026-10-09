import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'lazyPageReloadedAt';

/**
 * React.lazy for a route page. After a deploy, a tab opened before it still asks for the old
 * chunk file names, which no longer exist: the import fails and the page would stay blank. Then
 * the page is reloaded once (at most every 30 s, so a real outage can't loop), which fetches the
 * new index.html and its new chunks.
 */
export function lazyPage<T extends ComponentType<object>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await load();
    } catch (err) {
      let last = 0;
      try { last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0); } catch { /* storage blocked */ }
      if (Date.now() - last > 30_000) {
        try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* storage blocked */ }
        window.location.reload();
        return new Promise<{ default: T }>(() => {}); // the reload replaces the page
      }
      throw err;
    }
  });
}
