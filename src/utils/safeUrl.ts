// For URLs navigated to imperatively (window.location.href / window.open), where React 19's
// JSX-href javascript: blocking doesn't apply.
export function isSafeHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
