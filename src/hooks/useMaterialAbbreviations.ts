import { useEffect, useState } from 'react';
import { getMaterialAbbreviations } from '../services/materialService';

// Lower-cased material name → fibre code. Fetched once per visit and shared by every card.
let cache: Map<string, string> | null = null;
let pending: Promise<Map<string, string>> | null = null;

const load = () => {
  pending ??= getMaterialAbbreviations()
    .then(map => {
      cache = new Map(Object.entries(map).map(([name, code]) => [name.toLowerCase(), code]));
      return cache;
    })
    // Cosmetic only: without codes cards keep the full names (wrapping if needed), so a failure
    // isn't worth a message — the next page load tries again.
    .catch(() => { pending = null; return new Map<string, string>(); });
  return pending;
};

/** The fibre codes, empty until they arrive. */
export function useMaterialAbbreviations(): Map<string, string> {
  const [map, setMap] = useState<Map<string, string>>(() => cache ?? new Map());
  useEffect(() => {
    if (cache) return;
    let active = true;
    load().then(m => { if (active) setMap(m); });
    return () => { active = false; };
  }, []);
  return map;
}

/** For tests: forget what was fetched. */
export const resetMaterialAbbreviations = () => { cache = null; pending = null; };
