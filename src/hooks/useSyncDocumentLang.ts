import { useEffect } from 'react';
import i18n from '../i18n';

/**
 * Keeps <html lang="..."> in sync with the active i18next language. Without this it stays
 * whatever index.html hardcoded, misreporting the page's language to screen readers and search
 * engines for every visitor whose session isn't in that one language (this app supports es/ca/en
 * with a live switcher).
 */
export function useSyncDocumentLang() {
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    const handleLanguageChanged = (lng: string) => { document.documentElement.lang = lng; };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => i18n.off('languageChanged', handleLanguageChanged);
  }, []);
}
