import { useEffect, useState } from 'react';
import { getPageBySlug } from '../services/pageService';

/** The "Guía de tejidos" page: its fibre sections are anchored fibra-<code> (fibra-co, fibra-pes…). */
export const FABRIC_GUIDE_SLUG = 'guia-de-tejidos';
export const fabricGuideFibreHref = (code: string) => `/${FABRIC_GUIDE_SLUG}#fibra-${code.toLowerCase()}`;

// Checked once per visit: a shop without the guide page shows compositions without links.
let exists: boolean | null = null;
let pending: Promise<boolean> | null = null;

const check = () => {
  pending ??= getPageBySlug(FABRIC_GUIDE_SLUG, 1, 1)
    .then(() => (exists = true))
    .catch(() => (exists = false));
  return pending;
};

/** Whether the fabric guide page exists (false until known). */
export function useFabricGuide(): boolean {
  const [ok, setOk] = useState(exists ?? false);
  useEffect(() => {
    if (exists !== null) return;
    let active = true;
    check().then(v => { if (active) setOk(v); });
    return () => { active = false; };
  }, []);
  return ok;
}

/** For tests: forget the check. */
export const resetFabricGuide = () => { exists = null; pending = null; };
