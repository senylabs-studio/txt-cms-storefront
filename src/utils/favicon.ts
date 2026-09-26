/**
 * Points the browser-tab icon at the favicon configured in Site settings. index.html links the
 * app's neutral built-in icon, so a store with no favicon of its own (or before settings load)
 * still shows something that isn't a framework logo.
 */
export const applyFavicon = (url: string | undefined | null): void => {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.removeAttribute('type'); // the configured icon is a PNG/WebP/JPEG, not the default SVG
  link.href = url;
};
