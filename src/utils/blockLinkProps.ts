/**
 * Anchor props for an admin-authored block link (button, image link). A site path — what a
 * "página de la web" link resolves to, or a typed "/..." URL — stays in the same tab; anything
 * else is an external site and opens in a new one — except phone/email links, which hand off to
 * the phone or mail app and would only leave an empty tab behind.
 */
export const blockLinkProps = (url: string): { href: string; target?: string; rel?: string } =>
  (url.startsWith('/') && !url.startsWith('//')) || /^(tel|mailto):/i.test(url)
    ? { href: url }
    : { href: url, target: '_blank', rel: 'noopener noreferrer' };
