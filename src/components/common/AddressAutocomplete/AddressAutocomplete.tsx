import React, { useEffect, useRef, useState } from 'react';
import { Form, ListGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { isAddressAutocompleteEnabled, loadPlaces, parseAddressComponents, type ParsedAddress } from '../../../utils/googlePlaces';
import './AddressAutocomplete.css';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** A suggestion was picked: the street plus whatever else Google knows about it. */
  onSelect: (address: ParsedAddress) => void;
  /** Countries to search in (ISO codes, max 15 are used). Empty → anywhere. */
  regionCodes: string[];
  isInvalid?: boolean;
  /** Rendered right after the input, so Bootstrap's `.is-invalid ~ .invalid-feedback` still applies. */
  feedback?: React.ReactNode;
}

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

/**
 * Street field with Google Places suggestions. Typing by hand always works: without an API key,
 * or when Google fails, it behaves as a plain text input.
 */
const AddressAutocomplete: React.FC<Props> = ({ id, value, onChange, onSelect, regionCodes, isInvalid, feedback }) => {
  const { t, i18n } = useTranslation();
  const enabled = isAddressAutocompleteEnabled();
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const seqRef = useRef(0);
  // Only what the user types triggers a search, not values set by a selection or by the parent.
  const [query, setQuery] = useState<string | null>(null);
  const regionsKey = regionCodes.slice(0, 15).join(',');

  useEffect(() => {
    if (!enabled || query === null) return;
    const seq = ++seqRef.current;
    if (query.trim().length < MIN_CHARS) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const places = await loadPlaces();
        sessionRef.current ??= new places.AutocompleteSessionToken();
        const { suggestions: result } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionRef.current,
          language: i18n.language,
          includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'],
          ...(regionsKey ? { includedRegionCodes: regionsKey.split(',').map(c => c.toLowerCase()) } : {}),
        });
        if (seq !== seqRef.current) return;
        setSuggestions(result.map(s => s.placePrediction).filter((p): p is google.maps.places.PlacePrediction => !!p));
        setActive(-1);
        setOpen(true);
        setError(false);
      } catch {
        if (seq !== seqRef.current) return;
        setSuggestions([]);
        setError(true);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, query, regionsKey, i18n.language]);

  const choose = async (prediction: google.maps.places.PlacePrediction) => {
    ++seqRef.current;
    setOpen(false);
    setSuggestions([]);
    setQuery(null);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['addressComponents'] });
      const parsed = parseAddressComponents(place.addressComponents ?? []);
      // A street with no number: keep what was shown so the user only has to add the number.
      if (!parsed.street) parsed.street = prediction.mainText?.text ?? prediction.text.text;
      onSelect(parsed);
      setError(false);
    } catch {
      onChange(prediction.mainText?.text ?? prediction.text.text);
      setError(true);
    } finally {
      // fetchFields closes the billing session; the next search starts a new one.
      sessionRef.current = null;
      // Leave the cursor at the end so floor/door can be typed straight away.
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % suggestions.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i <= 0 ? suggestions.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); void choose(suggestions[active]); }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  };

  const listId = id ? `${id}-suggestions` : undefined;
  const showList = open && suggestions.length > 0;

  return (
    <div className="address-autocomplete">
      <Form.Control
        ref={inputRef}
        id={id}
        value={value}
        onChange={e => { onChange(e.target.value); setQuery(e.target.value); }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        isInvalid={isInvalid}
        autoComplete={enabled ? 'off' : 'street-address'}
        placeholder={enabled ? t('account.streetSearchPlaceholder') : undefined}
        role={enabled ? 'combobox' : undefined}
        aria-expanded={enabled ? showList : undefined}
        aria-controls={enabled ? listId : undefined}
        aria-autocomplete={enabled ? 'list' : undefined}
      />
      {feedback}
      {showList && (
        <ListGroup id={listId} role="listbox" className="address-autocomplete__list shadow-sm">
          {suggestions.map((s, i) => (
            <ListGroup.Item
              key={s.placeId}
              role="option"
              aria-selected={i === active}
              active={i === active}
              action
              // mousedown, not click: the input's blur would close the list first.
              onMouseDown={e => { e.preventDefault(); void choose(s); }}
            >
              <div>{s.mainText?.text ?? s.text.text}</div>
              {s.secondaryText && <div className="small text-muted">{s.secondaryText.text}</div>}
            </ListGroup.Item>
          ))}
          <ListGroup.Item className="address-autocomplete__attribution small text-muted text-end">Google Maps</ListGroup.Item>
        </ListGroup>
      )}
      {error && <Form.Text className="text-muted">{t('account.streetSuggestionsError')}</Form.Text>}
    </div>
  );
};

export default AddressAutocomplete;
