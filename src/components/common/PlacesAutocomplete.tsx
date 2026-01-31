import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Keyboard } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { GOOGLE_PLACES_API_KEY } from '../../constants';
import { colors, spacing, borderRadius, fontFamily, fontSize, elevation } from '../../constants/theme';

export interface PlaceDetails {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface PlacesAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onPlaceSelected: (details: PlaceDetails) => void;
  placeholder?: string;
  label?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

const DEBOUNCE_MS = 350;
const MIN_CHARS = 3;
const MAX_RESULTS = 5;

const PLACES_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACES_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

function parseAddressComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  description: string,
): {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
} {
  console.log('[PlacesAutocomplete] raw address_components:', JSON.stringify(components, null, 2));
  console.log('[PlacesAutocomplete] prediction description:', description);

  let sublocalityLevel2 = '';
  let sublocalityLevel1 = '';
  let city = '';
  let state = '';
  let pincode = '';

  for (const comp of components) {
    const types = comp.types;
    if (types.includes('sublocality_level_2')) {
      sublocalityLevel2 = comp.long_name;
    } else if (types.includes('sublocality_level_1')) {
      sublocalityLevel1 = comp.long_name;
    } else if (types.includes('locality')) {
      city = comp.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      state = comp.long_name;
    } else if (types.includes('postal_code')) {
      pincode = comp.long_name;
    }
  }

  // Build Line 1 from the prediction description rather than components,
  // so contextual words like "opposite", "near", "behind" are preserved.
  // Strip trailing city, state, country suffix from the description.
  let addressLine1 = '';
  if (city && description.includes(city)) {
    const cityIdx = description.indexOf(city);
    addressLine1 = description.substring(0, cityIdx).replace(/,\s*$/, '').trim();
  } else {
    // Fallback: drop last 2 comma-separated parts (state, country)
    const parts = description.split(',').map(p => p.trim());
    addressLine1 = parts.length > 2
      ? parts.slice(0, -2).join(', ')
      : description;
  }

  // Line 2: sublocality info from components, but only parts not already in Line 1
  const line2Candidates = [sublocalityLevel2, sublocalityLevel1].filter(Boolean);
  const line2Parts = line2Candidates.filter(part => !addressLine1.includes(part));
  const addressLine2 = line2Parts.join(', ');

  console.log('[PlacesAutocomplete] parsed:', { addressLine1, addressLine2, city, state, pincode });

  return { addressLine1, addressLine2, city, state, pincode };
}

export function PlacesAutocomplete({ value, onChangeText, onPlaceSelected, placeholder }: PlacesAutocompleteProps) {
  const { t } = useTranslation();

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<string>(Crypto.randomUUID());
  const abortRef = useRef<AbortController | null>(null);
  // Skip autocomplete for the next onChangeText (after a place is selected)
  const skipNextRef = useRef(false);

  const fetchPredictions = useCallback(async (input: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setNoResults(false);

    const url = `${PLACES_AUTOCOMPLETE_URL}?${new URLSearchParams({
      input,
      key: GOOGLE_PLACES_API_KEY,
      components: 'country:in',
      sessiontoken: sessionTokenRef.current,
    })}`;

    console.log('[PlacesAutocomplete] fetching:', url.replace(GOOGLE_PLACES_API_KEY, 'KEY_REDACTED'));

    try {
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();

      console.log('[PlacesAutocomplete] response status:', data.status, 'predictions:', data.predictions?.length ?? 0, 'error_message:', data.error_message ?? 'none');

      if (data.status === 'OK' && data.predictions?.length > 0) {
        setPredictions(data.predictions.slice(0, MAX_RESULTS));
        setShowSuggestions(true);
        setNoResults(false);
      } else if (data.status === 'ZERO_RESULTS') {
        setPredictions([]);
        setShowSuggestions(true);
        setNoResults(true);
      } else {
        console.warn('[PlacesAutocomplete] unexpected status:', data.status, data.error_message);
        setPredictions([]);
        setShowSuggestions(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[PlacesAutocomplete] fetch error:', err.message);
        setPredictions([]);
        setShowSuggestions(false);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleTextChange = useCallback((text: string) => {
    console.log('[PlacesAutocomplete] onChangeText:', JSON.stringify(text), 'len:', text.trim().length, 'skipNext:', skipNextRef.current);
    onChangeText(text);

    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < MIN_CHARS) {
      setPredictions([]);
      setShowSuggestions(false);
      setNoResults(false);
      return;
    }

    console.log('[PlacesAutocomplete] scheduling fetch in', DEBOUNCE_MS, 'ms');
    debounceRef.current = setTimeout(() => {
      fetchPredictions(text.trim());
    }, DEBOUNCE_MS);
  }, [onChangeText, fetchPredictions]);

  const handleSelect = useCallback(async (prediction: Prediction) => {
    setShowSuggestions(false);
    setPredictions([]);
    setIsFetchingDetails(true);

    try {
      const params = new URLSearchParams({
        place_id: prediction.place_id,
        key: GOOGLE_PLACES_API_KEY,
        fields: 'address_components,geometry,formatted_address',
        sessiontoken: sessionTokenRef.current,
      });

      const res = await fetch(`${PLACES_DETAILS_URL}?${params}`);
      const data = await res.json();

      sessionTokenRef.current = Crypto.randomUUID();

      if (data.status === 'OK' && data.result) {
        const result = data.result;
        const parsed = parseAddressComponents(result.address_components || [], prediction.description);
        const details: PlaceDetails = {
          ...parsed,
          lat: result.geometry?.location?.lat ?? 0,
          lng: result.geometry?.location?.lng ?? 0,
          formattedAddress: result.formatted_address || '',
        };
        // Set addressLine1 via the controlled prop without re-triggering autocomplete
        skipNextRef.current = true;
        onPlaceSelected(details);
      }
    } catch {
      // Silently fail — user can still fill fields manually
    } finally {
      setIsFetchingDetails(false);
      Keyboard.dismiss();
    }
  }, [onPlaceSelected]);

  const rightIcon = isFetchingDetails || isSearching
    ? <TextInput.Icon icon={() => <ActivityIndicator size={16} color={colors.brand} />} />
    : undefined;

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        mode="outlined"
        style={styles.input}
        right={rightIcon}
        outlineColor={colors.border}
        activeOutlineColor={colors.brand}
        dense
        autoCorrect={false}
      />
      {showSuggestions && (
        <View style={styles.suggestions}>
          {noResults ? (
            <View style={styles.noResultsRow}>
              <Text variant="bodySmall" style={styles.noResultsText}>
                {t('admin.addressSearchNoResults')}
              </Text>
            </View>
          ) : (
            predictions.map((pred) => (
              <Pressable
                key={pred.place_id}
                style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionPressed]}
                onPress={() => handleSelect(pred)}
              >
                <Text variant="bodySmall" style={styles.suggestionMain} numberOfLines={1}>
                  {pred.structured_formatting?.main_text || pred.description}
                </Text>
                {pred.structured_formatting?.secondary_text ? (
                  <Text variant="labelSmall" style={styles.suggestionSecondary} numberOfLines={1}>
                    {pred.structured_formatting.secondary_text}
                  </Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
  },
  suggestions: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    ...elevation.level2,
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionPressed: {
    backgroundColor: colors.pressedSurface,
  },
  suggestionMain: {
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    fontSize: fontSize.label,
  },
  suggestionSecondary: {
    color: colors.text.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  noResultsRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noResultsText: {
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
});
