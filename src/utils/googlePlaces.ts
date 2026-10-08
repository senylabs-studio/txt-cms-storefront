import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

/** Browser key for Google Places address suggestions. Empty → the address form stays a plain text field. */
const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';

export const isAddressAutocompleteEnabled = (): boolean => API_KEY !== '';

let placesPromise: Promise<google.maps.PlacesLibrary> | null = null;

/**
 * Loads the Places library on first use, so Google's script is only fetched when someone
 * actually types an address. A failed load is not cached: the next keystroke tries again.
 */
export const loadPlaces = (): Promise<google.maps.PlacesLibrary> => {
  if (!placesPromise) {
    setOptions({ key: API_KEY, v: 'weekly' });
    placesPromise = importLibrary('places').catch(err => {
      placesPromise = null;
      throw err;
    });
  }
  return placesPromise;
};

export interface ParsedAddress {
  street: string;
  postalCode: string;
  city: string;
  province: string;
  /** ISO 3166-1 alpha-2, e.g. "ES". */
  country: string;
}

type Component = Pick<google.maps.places.AddressComponent, 'longText' | 'shortText' | 'types'>;

// How the house number goes with the street name, by country. Anything not listed uses the
// Spanish style ("Calle Mayor, 10"), which is also how Portugal and Italy write it.
const NUMBER_FIRST = new Set(['FR', 'LU', 'MC', 'GB', 'IE', 'US', 'CA', 'AU', 'NZ']);     // "10 Rue de Rivoli"
const NUMBER_AFTER_NO_COMMA = new Set(['DE', 'AT', 'CH', 'NL', 'BE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'SK']); // "Hauptstraße 10"
// Countries whose "province" is Google's level 2 (Spain, Italy: provincia; France: département;
// UK: county). Elsewhere level 1 is the useful one (Portugal: distrito; Germany: Land; US: state).
const PROVINCE_IS_LEVEL_2 = new Set(['ES', 'IT', 'FR', 'GB']);

/** Turns Google's address components into our form fields ("Calle Mayor, 10", 28013, Madrid, Madrid, ES). */
export const parseAddressComponents = (components: Component[]): ParsedAddress => {
  const get = (type: string, short = false) => {
    const c = components.find(x => x.types.includes(type));
    return (short ? c?.shortText : c?.longText) ?? '';
  };
  const country = get('country', true).toUpperCase();
  const route = get('route');
  const number = get('street_number');
  let street = route || get('premise');
  if (route && number) {
    street = NUMBER_FIRST.has(country) ? `${number} ${route}`
      : NUMBER_AFTER_NO_COMMA.has(country) ? `${route} ${number}`
      : `${route}, ${number}`;
  }
  const level1 = get('administrative_area_level_1');
  const level2 = get('administrative_area_level_2');
  return {
    street,
    postalCode: get('postal_code'),
    city: get('locality') || get('postal_town') || get('administrative_area_level_3') || level2,
    province: PROVINCE_IS_LEVEL_2.has(country) ? level2 || level1 : level1 || level2,
    country,
  };
};
