import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * BrowserRouter keeps the window scroll position across route changes, so
 * clicking a product from a scrolled catalog opened the detail page halfway
 * down. Scroll to the top whenever the path changes through a link/navigate
 * (PUSH/REPLACE); leave back/forward (POP) to the browser.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
}
