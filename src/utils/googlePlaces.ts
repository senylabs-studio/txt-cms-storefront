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

/** Turns Google's address components into our form fields ("Calle Mayor, 10", 28013, Madrid, Madrid, ES). */
export const parseAddressComponents = (components: Component[]): ParsedAddress => {
  const get = (type: string, short = false) => {
    const c = components.find(x => x.types.includes(type));
    return (short ? c?.shortText : c?.longText) ?? '';
  };
  const route = get('route');
  const number = get('street_number');
  return {
    street: route && number ? `${route}, ${number}` : route || get('premise'),
    postalCode: get('postal_code'),
    city: get('locality') || get('postal_town') || get('administrative_area_level_3') || get('administrative_area_level_2'),
    // In Spain level 2 is the province (level 1 is the autonomous community).
    province: get('administrative_area_level_2') || get('administrative_area_level_1'),
    country: get('country', true).toUpperCase(),
  };
};
