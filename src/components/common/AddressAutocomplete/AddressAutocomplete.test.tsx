import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import AddressAutocomplete from './AddressAutocomplete';
import { parseAddressComponents, type ParsedAddress } from '../../../utils/googlePlaces';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const places = vi.hoisted(() => ({ enabled: true, fetchSuggestions: vi.fn(), fetchFields: vi.fn(), load: vi.fn() }));

vi.mock('../../../utils/googlePlaces', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../utils/googlePlaces')>()),
  isAddressAutocompleteEnabled: () => places.enabled,
  loadPlaces: places.load,
}));

const comp = (types: string[], longText: string, shortText = longText) => ({ types, longText, shortText });

const madrid = [
  comp(['street_number'], '10'),
  comp(['route'], 'Calle Mayor', 'C. Mayor'),
  comp(['locality', 'political'], 'Madrid'),
  comp(['administrative_area_level_2', 'political'], 'Madrid', 'M'),
  comp(['administrative_area_level_1', 'political'], 'Comunidad de Madrid', 'MD'),
  comp(['country', 'political'], 'España', 'es'),
  comp(['postal_code'], '28013'),
];

const prediction = (placeId: string, main: string, secondary: string) => {
  const place = { addressComponents: undefined as unknown, fetchFields: async () => { place.addressComponents = await places.fetchFields(placeId); } };
  return { placeId, mainText: { text: main }, secondaryText: { text: secondary }, text: { text: `${main}, ${secondary}` }, toPlace: () => place };
};

const Harness = ({ onSelect }: { onSelect: (a: ParsedAddress) => void }) => {
  const [value, setValue] = useState('');
  return <AddressAutocomplete id="street" value={value} onChange={setValue} onSelect={a => { setValue(a.street); onSelect(a); }} regionCodes={['ES']} />;
};

beforeEach(() => {
  places.enabled = true;
  places.fetchSuggestions.mockReset();
  places.fetchFields.mockReset();
  places.load.mockReset().mockResolvedValue({
    AutocompleteSessionToken: class {},
    AutocompleteSuggestion: { fetchAutocompleteSuggestions: places.fetchSuggestions },
  });
});

describe('parseAddressComponents', () => {
  it('maps a Spanish address to the form fields', () => {
    expect(parseAddressComponents(madrid)).toEqual({
      street: 'Calle Mayor, 10', postalCode: '28013', city: 'Madrid', province: 'Madrid', country: 'ES',
    });
  });

  it('keeps the street without a number and falls back for the city', () => {
    const r = parseAddressComponents([comp(['route'], 'Carrer Gran'), comp(['administrative_area_level_3'], 'Sant Cugat'), comp(['country'], 'Spain', 'ES')]);
    expect(r.street).toBe('Carrer Gran');
    expect(r.city).toBe('Sant Cugat');
    expect(r.postalCode).toBe('');
  });
});

describe('AddressAutocomplete', () => {
  it('is a plain field without an API key and never loads Google', async () => {
    places.enabled = false;
    render(<Harness onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Calle Mayor 10' } });
    await new Promise(r => setTimeout(r, 400));
    expect(places.load).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('suggests addresses in the chosen country and fills the form on pick', async () => {
    places.fetchSuggestions.mockResolvedValue({ suggestions: [{ placePrediction: prediction('p1', 'Calle Mayor, 10', 'Madrid, España') }] });
    places.fetchFields.mockResolvedValue(madrid);
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'calle mayor 10' } });
    const option = await screen.findByRole('option', { name: /Calle Mayor, 10/ });
    expect(places.fetchSuggestions).toHaveBeenCalledWith(expect.objectContaining({ input: 'calle mayor 10', includedRegionCodes: ['es'], language: 'es' }));

    fireEvent.mouseDown(option);
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({
      street: 'Calle Mayor, 10', postalCode: '28013', city: 'Madrid', province: 'Madrid', country: 'ES',
    }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'Calle Mayor, 10');
  });

  it('drops an older, slower answer', async () => {
    let resolveFirst!: (v: unknown) => void;
    places.fetchSuggestions
      .mockImplementationOnce(() => new Promise(r => { resolveFirst = r; }))
      .mockResolvedValueOnce({ suggestions: [{ placePrediction: prediction('p2', 'Calle Mayor, 12', 'Madrid') }] });
    render(<Harness onSelect={vi.fn()} />);
    const input = screen.getByRole('combobox');

    fireEvent.change(input, { target: { value: 'calle mayor 1' } });
    await waitFor(() => expect(places.fetchSuggestions).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: 'calle mayor 12' } });
    await screen.findByRole('option', { name: /Calle Mayor, 12/ });

    resolveFirst({ suggestions: [{ placePrediction: prediction('p1', 'Calle Mayor, 1', 'Madrid') }] });
    await new Promise(r => setTimeout(r, 0));
    await waitFor(() => expect(screen.getAllByRole('option').map(o => o.firstChild?.textContent)).toEqual(['Calle Mayor, 12']));
  });

  it('tells the user to type by hand when Google fails', async () => {
    places.load.mockRejectedValue(new Error('blocked'));
    render(<Harness onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'calle mayor' } });
    expect(await screen.findByText('account.streetSuggestionsError')).toBeTruthy();
  });
});
