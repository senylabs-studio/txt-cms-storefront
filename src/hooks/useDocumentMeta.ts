import { useEffect } from 'react';

// Search engines and social-share previews truncate meta descriptions around this length;
// anything longer is cut off unpredictably rather than at a clean word boundary.
const MAX_DESCRIPTION_LENGTH = 160;

/**
 * Sets document.title and the page's meta description for as long as the calling page is
 * mounted. No restore-on-unmount: with client-side routing the next page's own call always
 * overwrites these before the user would notice a stale value, so restoring here would just add
 * an unnecessary flicker between routes.
 *
 * Always writes the description tag (even to an empty string when none is given) rather than
 * skipping the write when `description` is falsy — skipping used to leave the *previous* page's
 * description in place whenever the new page had none of its own.
 */
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    // CMS free-text fields can contain newlines and run arbitrarily long; a meta description
    // should be a single clean line within the length search engines actually use.
    const cleaned = (description ?? '').replace(/\s+/g, ' ').trim();
    meta.content = cleaned.length > MAX_DESCRIPTION_LENGTH
      ? cleaned.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd() + '…'
      : cleaned;
  }, [title, description]);
}
