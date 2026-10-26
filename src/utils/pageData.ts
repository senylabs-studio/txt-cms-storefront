// The server's copies for the first paint (server/meta.mjs pageDataScript), read once per element.
const read = new Map<string, { lang: string; data: unknown } | null>();

/** The data the server put in the page under `id`, when it's in the language the app opens in and
 *  `isValid` accepts it; else null (and the app asks the API as before). */
export function pageData<T>(id: string, language: string, isValid: (data: unknown) => boolean): T | null {
  if (!read.has(id)) {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    let entry: { lang: string; data: unknown } | null = null;
    try {
      const data = el ? JSON.parse(el.textContent ?? '') : null;
      if (isValid(data)) entry = { lang: el!.getAttribute('data-lang') ?? '', data };
    } catch { /* unreadable: ask the API */ }
    read.set(id, entry);
  }
  const entry = read.get(id);
  return entry && entry.lang === language.slice(0, 2) ? (entry.data as T) : null;
}

let reported = false;

/** The API answered differently from the page copy (a CMS change since the server last read it):
 *  the server reads it again, so the next visitor gets the new one. Once per visit. */
export function reportStalePageData(): void {
  if (reported) return;
  reported = true;
  fetch('/__refresh', { method: 'POST', keepalive: true }).catch(() => { /* the server refreshes on its own anyway */ });
}
