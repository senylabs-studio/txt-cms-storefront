import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['es', 'ca', 'en'],
    fallbackLng: 'es',
    detection: {
      // ?lng= first: links in emails carry the email's language (a Catalan reset email opened
      // on a phone with a Spanish browser showed the page in Spanish). Not the browser's
      // language (audit 2026-10-14): Googlebot browses as en-US and indexed Spanish URLs with
      // English text; the shop is Spanish unless the visitor picks another language.
      order: ['querystring', 'localStorage'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'lng',
      caches: ['localStorage'],
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    react: {
      useSuspense: false,
    },
    // React already escapes text content when rendering, so i18next's own escaping (meant for
    // raw-HTML templating without React) only causes a double-escape — e.g. an interpolated
    // date like "8/29/2026" rendering literally as "8&#x2F;29&#x2F;2026" on screen.
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
