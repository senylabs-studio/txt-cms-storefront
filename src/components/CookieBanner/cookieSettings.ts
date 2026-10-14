export const OPEN_COOKIE_SETTINGS_EVENT = 'cookie-settings:open';

/** Opens the cookie settings again (footer «Configurar cookies»): consent can be changed or
 *  withdrawn at any time. */
export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
