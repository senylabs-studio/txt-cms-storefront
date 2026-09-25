import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const EXPAND_BELOW = 48; // px of scroll: back near the top → full header again
const HYSTERESIS_GAP = 24;

/**
 * Whether the sticky header should be in its compact form. Collapsing removes rows from the
 * header, so the page gets shorter by exactly that much and the browser's scroll anchoring moves
 * the scroll position up by the same amount. With a single threshold (it used to be 48px) that
 * correction dropped the page straight back under it, the header expanded, the page grew, the
 * scroll moved down… and the header flickered endlessly while the user sat anywhere in that band.
 * So it collapses only past EXPAND_BELOW + the height actually removed (measured live, so it holds
 * on every breakpoint), and expands only back under EXPAND_BELOW — the correction can never cross
 * the opposite threshold.
 */
export default function useCollapsingHeader<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);
  const heights = useRef({ expanded: 0, collapsed: 0 });

  // Keep the height of whichever form is showing up to date (resizes, breakpoints, fonts…).
  useLayoutEffect(() => {
    collapsedRef.current = collapsed;
    const el = ref.current;
    if (!el) return;
    const record = () => { heights.current[collapsedRef.current ? 'collapsed' : 'expanded'] = el.offsetHeight; };
    record();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(record);
    observer.observe(el);
    return () => observer.disconnect();
  }, [collapsed]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Until the compact form has been measured, assume it removes the whole expanded height —
      // an overestimate, so still safe.
      const removed = Math.max(0, heights.current.expanded - heights.current.collapsed);
      const next = collapsedRef.current
        ? y >= EXPAND_BELOW
        : y > EXPAND_BELOW + removed + HYSTERESIS_GAP;
      if (next !== collapsedRef.current) {
        collapsedRef.current = next;
        setCollapsed(next);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return [collapsed, ref] as const;
}
