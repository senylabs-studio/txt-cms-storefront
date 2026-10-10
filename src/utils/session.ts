/** Fired by apiClient when the API refuses the current token (expired, password changed…):
 *  AuthContext signs out without reloading the page. */
export const SESSION_EXPIRED_EVENT = 'storefront:session-expired';

/** Pages only a signed-in customer can use: an expired session there goes to the login. */
const PROTECTED_PREFIXES = ['/checkout', '/account', '/favorites', '/board'];
export const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));

/** True when the JWT's exp is in the past (or it can't be read). */
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

/** A path on this site to go back to after logging in ("/x?y"), never "//host". */
export const safeReturnPath = (path: string | null | undefined): string | null =>
  path && path.startsWith('/') && !/^\/[/\\]/.test(path) ? path : null;

/** The login page, coming back to where the shopper is now after logging in. */
export const loginUrl = () =>
  `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
