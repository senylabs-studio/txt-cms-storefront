const KEY = 'stale-chunk-reload-at';

/** A deploy replaces the site's files (clean deploy): a tab opened on the previous version then
 *  asks for page chunks that no longer exist and showed an error. Vite reports it as
 *  `vite:preloadError`; reload once to get the new version. Not again within 10 s, so a chunk
 *  that's genuinely missing shows its error instead of reloading forever. */
export function installStaleChunkReload(win: Window = window): void {
  win.addEventListener('vite:preloadError', event => {
    let last = 0;
    try { last = Number(win.sessionStorage.getItem(KEY)) || 0; } catch { /* storage blocked */ }
    if (Date.now() - last < 10_000) return;
    event.preventDefault();
    try { win.sessionStorage.setItem(KEY, String(Date.now())); } catch { /* storage blocked */ }
    win.location.reload();
  });
}
