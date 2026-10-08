import i18next from 'i18next';

const LOCALES: Record<string, string> = { es: 'es-ES', ca: 'ca-ES', en: 'en-GB' };

/** The Intl locale of the shop's current UI language (not the browser's). */
export const uiLocale = (): string => LOCALES[(i18next.language ?? 'es').slice(0, 2)] ?? 'es-ES';

/** A date in the UI language: "8/10/2026", or with options e.g. "8 d'octubre de 2026". */
export const formatDate = (value: string | Date, options?: Intl.DateTimeFormatOptions): string =>
  new Date(value).toLocaleDateString(uiLocale(), options);

/** A country's name in the UI language from its ISO code ("ES" → "Espanya" in Catalan). */
export const countryName = (isoCode: string | null | undefined): string => {
  if (!isoCode) return '';
  try {
    return new Intl.DisplayNames([uiLocale()], { type: 'region' }).of(isoCode.toUpperCase()) ?? isoCode;
  } catch {
    return isoCode;
  }
};
