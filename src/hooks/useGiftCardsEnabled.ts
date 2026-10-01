import { useEffect, useState } from 'react';
import { getGiftCardConfig } from '../services/giftCardService';

// One request per page load, shared by every component asking (the header renders several
// copies of its icons at once).
let pending: Promise<boolean> | null = null;

/** Whether gift cards are on sale — false until known, and on any error. */
const useGiftCardsEnabled = (): boolean => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    pending ??= getGiftCardConfig().then(c => c.enabled).catch(() => { pending = null; return false; });
    pending.then(value => { if (!cancelled) setEnabled(value); });
    return () => { cancelled = true; };
  }, []);
  return enabled;
};

export default useGiftCardsEnabled;
