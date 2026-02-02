import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Keyboard } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { GOOGLE_PLACES_API_KEY } from '../../constants';
import { parseAddressComponents } from '../../utils/geocoding';
import { spacing, borderRadius, fontFamily, fontSize, elevation } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

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

export function PlacesAutocomplete({ value, onChangeText, onPlaceSelected, placeholder, label }: PlacesAutocompleteProps) {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();

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
    ? <TextInput.Icon icon={() => <ActivityIndicator size={16} color={appColors.brand} />} />
    : undefined;

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={handleTextChange}
        label={label}
        placeholder={placeholder}
        mode="outlined"
        style={{ backgroundColor: appColors.surface }}
        right={rightIcon}
        outlineColor={appColors.border}
        activeOutlineColor={appColors.brand}
        dense
        autoCorrect={false}
      />
      {showSuggestions && (
        <View style={[styles.suggestions, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
          {noResults ? (
            <View style={styles.noResultsRow}>
              <Text variant="bodySmall" style={[styles.noResultsText, { color: appColors.text.secondary }]}>
                {t('admin.addressSearchNoResults')}
              </Text>
            </View>
          ) : (
            predictions.map((pred) => (
              <Pressable
                key={pred.place_id}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  { borderBottomColor: appColors.border },
                  pressed && { backgroundColor: appColors.pressedSurface },
                ]}
                onPress={() => handleSelect(pred)}
              >
                <Text variant="bodySmall" style={[styles.suggestionMain, { color: appColors.text.primary }]} numberOfLines={1}>
                  {pred.structured_formatting?.main_text || pred.description}
                </Text>
                {pred.structured_formatting?.secondary_text ? (
                  <Text variant="labelSmall" style={[styles.suggestionSecondary, { color: appColors.text.secondary }]} numberOfLines={1}>
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
  suggestions: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    ...elevation.level2,
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionMain: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.label,
  },
  suggestionSecondary: {
    fontSize: 11,
    marginTop: 2,
  },
  noResultsRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noResultsText: {
    fontStyle: 'italic',
  },
});
