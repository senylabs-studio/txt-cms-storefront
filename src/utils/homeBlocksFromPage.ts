import type { StorefrontHomeBlock } from '../services/homeService';
import { pageData } from './pageData';

/** The home blocks the server put in the page, when they're in the language the app opens in
 *  (else null and the home asks the API as before). Lets the home paint without waiting for it. */
export const homeBlocksFromPage = (language: string): StorefrontHomeBlock[] | null =>
  pageData<StorefrontHomeBlock[]>('home-blocks', language, Array.isArray);
