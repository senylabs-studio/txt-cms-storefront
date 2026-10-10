import { useEffect, useRef } from 'react';

/** The off-canvas filter panel as a dialog for the keyboard: focus goes into it when it opens and
 *  back to what opened it when it closes, and Escape closes it. (Closed, CSS takes it out of the
 *  tab order — it used to be about 20 invisible stops at the top of every catalog page.) */
export function useFilterPanel(open: boolean, close: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      openerRef.current?.focus();
      openerRef.current = null;
      return;
    }
    openerRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- close is a fresh closure each render; only open matters
  }, [open]);

  return panelRef;
}
