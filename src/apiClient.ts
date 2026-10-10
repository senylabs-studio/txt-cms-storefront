import axios from 'axios';
import i18n from './i18n';
import { SESSION_EXPIRED_EVENT, isProtectedPath } from './utils/session';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('storefront_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Language'] = i18n.language;
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const current = localStorage.getItem('storefront_token');
      const sentWith = String(error.config?.headers?.Authorization ?? '');
      // Only when the refused token is still the current one: a late answer to a request sent
      // with an old token must not sign out the session that just replaced it (guest access
      // link, login).
      if (current && sentWith === `Bearer ${current}`) {
        localStorage.removeItem('storefront_token');
        localStorage.removeItem('storefront_user');
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        // Only a page that needs the session goes to the login (and comes back after it); a
        // product page, a reset-password or guest-access link just goes on signed out.
        const { pathname, search } = window.location;
        if (isProtectedPath(pathname))
          window.location.href = `/login?expired=1&from=${encodeURIComponent(pathname + search)}`;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
