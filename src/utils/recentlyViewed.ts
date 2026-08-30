const STORAGE_KEY = 'recently_viewed_variants';
const MAX_ITEMS = 12;

// localStorage can throw (private browsing, disabled storage, quota) — this feature is a nice-to-have
// rail, never worth breaking the page over.
export const recordVariantView = (variantId: number): void => {
  try {
    const ids = getRecentlyViewedIds();
    const next = [variantId, ...ids.filter(id => id !== variantId)].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

export const getRecentlyViewedIds = (excludeId?: number): number[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ids)) return [];
    const numericIds = ids.filter((id): id is number => typeof id === 'number');
    return excludeId != null ? numericIds.filter(id => id !== excludeId) : numericIds;
  } catch {
    return [];
  }
};
