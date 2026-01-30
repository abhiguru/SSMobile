import { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors, spacing, borderRadius, fontFamily } from '../../constants/theme';
import { DEFAULT_MAP_CENTER } from '../../constants';
import { AppButton } from './AppButton';

interface MapPinPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number, formattedAddress?: string) => void;
  addressText?: string;
}

export function MapPinPicker({ latitude, longitude, onLocationChange, addressText }: MapPinPickerProps) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const [pinCoords, setPinCoords] = useState<{ latitude: number; longitude: number } | null>(
    latitude != null && longitude != null ? { latitude, longitude } : null,
  );
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Sync from props when they change externally (e.g. opening an existing address)
  useEffect(() => {
    if (latitude != null && longitude != null) {
      setPinCoords({ latitude, longitude });
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  }, [latitude, longitude]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const r = results[0];
        const parts = [r.name, r.street, r.city, r.region, r.postalCode].filter(Boolean);
        return parts.join(', ');
      }
    } catch {
      // Ignore reverse geocode failures silently
    }
    return undefined;
  }, []);

  const handleMapPress = useCallback(async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    setPinCoords({ latitude: lat, longitude: lng });
    setGeocodeError(null);
    const addr = await reverseGeocode(lat, lng);
    if (addr) setResolvedAddress(addr);
    onLocationChange(lat, lng, addr);
  }, [onLocationChange, reverseGeocode]);

  const handleDragEnd = useCallback(async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    setPinCoords({ latitude: lat, longitude: lng });
    setGeocodeError(null);
    const addr = await reverseGeocode(lat, lng);
    if (addr) setResolvedAddress(addr);
    onLocationChange(lat, lng, addr);
  }, [onLocationChange, reverseGeocode]);

  const handleLocateOnMap = useCallback(async () => {
    // Prefer existing coordinates (from saved address or PlacesAutocomplete)
    if (latitude != null && longitude != null) {
      setPinCoords({ latitude, longitude });
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
      const addr = await reverseGeocode(latitude, longitude);
      if (addr) setResolvedAddress(addr);
      onLocationChange(latitude, longitude, addr);
      return;
    }

    // Fallback: geocode from address text when no coordinates available
    if (!addressText?.trim()) return;
    setIsGeocoding(true);
    setGeocodeError(null);
    try {
      const results = await Location.geocodeAsync(addressText);
      if (results.length > 0) {
        const { latitude: lat, longitude: lng } = results[0];
        setPinCoords({ latitude: lat, longitude: lng });
        mapRef.current?.animateToRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
        const addr = await reverseGeocode(lat, lng);
        if (addr) setResolvedAddress(addr);
        onLocationChange(lat, lng, addr);
      } else {
        setGeocodeError(t('admin.geocodingFailed'));
      }
    } catch {
      setGeocodeError(t('admin.geocodingFailed'));
    } finally {
      setIsGeocoding(false);
    }
  }, [latitude, longitude, addressText, onLocationChange, reverseGeocode, t]);

  const initialRegion: Region = pinCoords
    ? { ...pinCoords, latitudeDelta: 0.005, longitudeDelta: 0.005 }
    : DEFAULT_MAP_CENTER;

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <AppButton
          variant="secondary"
          size="sm"
          onPress={handleLocateOnMap}
          disabled={isGeocoding || (latitude == null && longitude == null && !addressText?.trim())}
        >
          {t('admin.locateOnMap')}
        </AppButton>
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onLongPress={handleMapPress}
        >
          {pinCoords && (
            <Marker
              coordinate={pinCoords}
              draggable
              onDragEnd={handleDragEnd}
            />
          )}
        </MapView>

        {isGeocoding && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        )}
      </View>

      <Text variant="bodySmall" style={styles.hint}>
        {pinCoords ? t('admin.mapPinHint') : t('admin.mapTapHint')}
      </Text>

      {geocodeError && (
        <Text variant="bodySmall" style={styles.error}>
          {geocodeError}
        </Text>
      )}

      {resolvedAddress && !geocodeError && (
        <Text variant="bodySmall" style={styles.resolved}>
          {t('admin.resolvedAddress', { address: resolvedAddress })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  mapWrapper: {
    height: 250,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  error: {
    color: colors.critical,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  resolved: {
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    fontSize: 12,
  },
});
