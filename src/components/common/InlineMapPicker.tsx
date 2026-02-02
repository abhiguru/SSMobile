import { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert, Linking, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

import { reverseGeocodeGoogle } from '../../utils/geocoding';
import type { PlaceDetails } from './PlacesAutocomplete';
import { DEFAULT_MAP_CENTER } from '../../constants';
import { spacing, borderRadius, fontFamily, fontSize, elevation } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
interface InlineMapPickerProps {
  lat: number | null;
  lng: number | null;
  onUseAddress: (details: PlaceDetails) => void;
  onClearAddress: () => void;
}

const DEBOUNCE_MS = 700;
const MAP_HEIGHT = 200;

export function InlineMapPicker({ lat, lng, onUseAddress, onClearAddress }: InlineMapPickerProps) {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emittedCoords = useRef<{ lat: number; lng: number } | null>(null);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [resolvedDetails, setResolvedDetails] = useState<PlaceDetails | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [applied, setApplied] = useState(false);

  const centerLat = lat ?? DEFAULT_MAP_CENTER.latitude;
  const centerLng = lng ?? DEFAULT_MAP_CENTER.longitude;

  // Animate map when lat/lng change externally (e.g. from PlacesAutocomplete)
  useEffect(() => {
    if (lat == null || lng == null) return;
    const emitted = emittedCoords.current;
    if (emitted && emitted.lat === lat && emitted.lng === lng) return;
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      500,
    );
  }, [lat, lng]);

  const geocodeCenter = useCallback(async (r: Region) => {
    setIsGeocoding(true);
    const result = await reverseGeocodeGoogle(r.latitude, r.longitude);
    if (result) {
      setResolvedDetails({
        addressLine1: result.addressLine1,
        addressLine2: result.addressLine2,
        city: result.city,
        state: result.state,
        pincode: result.pincode,
        lat: r.latitude,
        lng: r.longitude,
        formattedAddress: result.formattedAddress,
      });
      setApplied(false);
    } else {
      setResolvedDetails(null);
      setApplied(false);
    }
    setIsGeocoding(false);
  }, []);

  const handleRegionChangeComplete = useCallback(
    (r: Region) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => geocodeCenter(r), DEBOUNCE_MS);
    },
    [geocodeCenter],
  );

  const handleToggleAddress = useCallback(() => {
    if (!resolvedDetails) return;
    if (applied) {
      setApplied(false);
      onClearAddress();
    } else {
      setApplied(true);
      emittedCoords.current = { lat: resolvedDetails.lat, lng: resolvedDetails.lng };
      onUseAddress(resolvedDetails);
    }
  }, [resolvedDetails, applied, onUseAddress, onClearAddress]);

  const handleGpsPress = useCallback(async () => {
    setIsFetchingGps(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      let granted = status === 'granted';

      if (!granted) {
        const response = await Location.requestForegroundPermissionsAsync();
        granted = response.status === 'granted';
      }

      if (!granted) {
        Alert.alert(
          t('addresses.locationPermissionTitle'),
          t('addresses.locationPermissionMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('addresses.openSettings'), onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      mapRef.current?.animateToRegion(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      );
    } catch (err) {
      console.error('[InlineMapPicker] GPS error:', err instanceof Error ? err.message : err);
    } finally {
      setIsFetchingGps(false);
    }
  }, [t]);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.mapContainer, { borderColor: appColors.fieldBackground }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onRegionChangeComplete={handleRegionChangeComplete}
        />

        {/* Fixed center pin */}
        <View style={styles.pinOverlay} pointerEvents="none">
          <MaterialCommunityIcons
            name="map-marker"
            size={40}
            color={appColors.negative}
            style={styles.pinIcon}
          />
        </View>

        {/* GPS FAB */}
        <Pressable
          onPress={handleGpsPress}
          disabled={isFetchingGps}
          style={[styles.gpsFab, { backgroundColor: appColors.surface, ...elevation.level3 }]}
        >
          {isFetchingGps ? (
            <ActivityIndicator size={18} color={appColors.brand} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={appColors.brand} />
          )}
        </Pressable>

        {/* Translucent address overlay at bottom of map */}
        {(isGeocoding || resolvedDetails) && (
          <Pressable
            style={[styles.addressOverlay, { backgroundColor: applied ? 'rgba(0,100,0,0.7)' : 'rgba(0,0,0,0.6)' }]}
            onPress={resolvedDetails ? handleToggleAddress : undefined}
            disabled={isGeocoding || !resolvedDetails}
          >
            {isGeocoding ? (
              <View style={styles.addressRow}>
                <ActivityIndicator size={14} color="#FFFFFF" />
                <Text variant="bodySmall" style={[styles.addressText, { color: 'rgba(255,255,255,0.7)' }]}>
                  {t('common.loading')}
                </Text>
              </View>
            ) : resolvedDetails ? (
              <View style={styles.addressRow}>
                <MaterialCommunityIcons name={applied ? 'close-circle' : 'map-marker-outline'} size={16} color="#FFFFFF" />
                <Text variant="bodySmall" style={[styles.addressText, { color: '#FFFFFF' }]} numberOfLines={2}>
                  {resolvedDetails.formattedAddress}
                </Text>
                <MaterialCommunityIcons name={applied ? 'check-circle' : 'check-circle-outline'} size={20} color="#FFFFFF" />
              </View>
            ) : null}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinIcon: {
    marginTop: -40,
  },
  gpsFab: {
    position: 'absolute',
    bottom: 40 + spacing.sm,
    right: spacing.sm,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addressText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
});
