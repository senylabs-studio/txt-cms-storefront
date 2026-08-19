import { useEffect } from 'react';

/**
 * Sets document.title and the page's meta description for as long as the calling page is
 * mounted. No restore-on-unmount: with client-side routing the next page's own call always
 * overwrites these before the user would notice a stale value, so restoring here would just add
 * an unnecessary flicker between routes.
 */
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;

    if (!description) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [title, description]);
}
