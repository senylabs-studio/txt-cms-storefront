// A heart tapped before logging in: remembered here (this tab, half an hour) and saved by the
// favourites context once the customer is logged in, instead of being lost on the way to the login.
const KEY = 'pending_favorite';
const MAX_AGE_MS = 30 * 60 * 1000;

export interface PendingFavorite { productId?: number; variantId?: number }

export function savePendingFavorite(productId?: number, variantId?: number): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ productId, variantId, at: Date.now() }));
  } catch { /* storage blocked: the heart just isn't remembered */ }
}

/** The pending heart, removed as it's read; null when there's none or it's too old. */
export function takePendingFavorite(): PendingFavorite | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const p = JSON.parse(raw) as PendingFavorite & { at?: number };
    if (!p.at || Date.now() - p.at > MAX_AGE_MS || (p.variantId == null && p.productId == null)) return null;
    return { productId: p.productId, variantId: p.variantId };
  } catch {
    return null;
  }
}
