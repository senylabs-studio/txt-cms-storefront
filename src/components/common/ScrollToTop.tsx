import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * BrowserRouter keeps the window scroll position across route changes, so
 * clicking a product from a scrolled catalog opened the detail page halfway
 * down. Scroll to the top whenever the path changes through a link/navigate
 * (PUSH/REPLACE); leave back/forward (POP) to the browser.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    // A link to a section (#reviews): the page scrolls there itself once it has loaded.
    if (navigationType !== 'POP' && !hash) window.scrollTo(0, 0);
  }, [pathname, navigationType, hash]);

  return null;
}
