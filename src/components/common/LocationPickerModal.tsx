import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  BackHandler,
  Platform,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator, Portal } from 'react-native-paper';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { reverseGeocodeGoogle } from '../../utils/geocoding';
import type { PlaceDetails } from './PlacesAutocomplete';
import { DEFAULT_MAP_CENTER } from '../../constants';
import { spacing, borderRadius, fontFamily, fontSize, elevation } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
import { AppButton } from './AppButton';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (details: PlaceDetails) => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}

const DEBOUNCE_MS = 700;

export function LocationPickerModal({
  visible,
  onClose,
  onConfirm,
  initialLatitude,
  initialLongitude,
}: LocationPickerModalProps) {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [resolvedDetails, setResolvedDetails] = useState<PlaceDetails | null>(null);

  const initialLat = initialLatitude ?? DEFAULT_MAP_CENTER.latitude;
  const initialLng = initialLongitude ?? DEFAULT_MAP_CENTER.longitude;

  console.log('[LocationPicker] render visible=%s initialLat=%s initialLng=%s', visible, initialLat, initialLng);

  // Reset state when modal opens with new coords
  useEffect(() => {
    if (visible) {
      setResolvedAddress('');
      setResolvedDetails(null);
    }
  }, [visible, initialLatitude, initialLongitude]);

  // Android back button
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => handler.remove();
  }, [visible, onClose]);

  const geocodeCenter = useCallback(async (r: Region) => {
    console.log('[LocationPicker] geocodeCenter lat=%s lng=%s', r.latitude, r.longitude);
    setIsGeocoding(true);
    const result = await reverseGeocodeGoogle(r.latitude, r.longitude);
    console.log('[LocationPicker] geocode result:', result ? result.formattedAddress : 'null');
    if (result) {
      setResolvedAddress(result.formattedAddress);
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
    } else {
      setResolvedAddress('');
      setResolvedDetails(null);
    }
    setIsGeocoding(false);
  }, []);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    console.log('[LocationPicker] onRegionChangeComplete lat=%s lng=%s delta=%s', r.latitude, r.longitude, r.latitudeDelta);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => geocodeCenter(r), DEBOUNCE_MS);
  }, [geocodeCenter]);

  const handleRecenter = useCallback(() => {
    const lat = initialLatitude ?? DEFAULT_MAP_CENTER.latitude;
    const lng = initialLongitude ?? DEFAULT_MAP_CENTER.longitude;
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 500);
  }, [initialLatitude, initialLongitude]);

  const handleConfirm = useCallback(() => {
    if (resolvedDetails) {
      onConfirm(resolvedDetails);
    }
  }, [resolvedDetails, onConfirm]);

  if (!visible) return null;

  return (
    <Portal>
    <View style={[styles.root, { backgroundColor: appColors.shell }]}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: appColors.surface, paddingTop: insets.top }]}>
        <Pressable onPress={onClose} style={styles.backButton} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={appColors.text.primary} />
        </Pressable>
        <Text variant="titleMedium" style={[styles.headerTitle, { color: appColors.text.primary }]}>
          {t('addresses.pickLocation')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: initialLat,
            longitude: initialLng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onRegionChangeComplete={handleRegionChangeComplete}
          onMapReady={() => console.log('[LocationPicker] onMapReady fired')}
          onMapLoaded={() => console.log('[LocationPicker] onMapLoaded — tiles rendered')}
          onLayout={(e) => console.log('[LocationPicker] MapView onLayout w=%s h=%s', e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
        />

        {/* Fixed center pin overlay */}
        <View style={styles.pinOverlay} pointerEvents="none">
          <MaterialCommunityIcons
            name="map-marker"
            size={48}
            color={appColors.negative}
            style={styles.pinIcon}
          />
        </View>

        {/* Adjust hint */}
        <View style={[styles.hintBadge, { backgroundColor: appColors.surface }]} pointerEvents="none">
          <Text variant="labelSmall" style={{ color: appColors.text.secondary, fontFamily: fontFamily.regular }}>
            {t('addresses.adjustPin')}
          </Text>
        </View>

        {/* Re-center FAB */}
        <Pressable
          onPress={handleRecenter}
          style={[styles.recenterFab, { backgroundColor: appColors.surface, ...elevation.level3 }]}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={appColors.brand} />
        </Pressable>
      </View>

      {/* Bottom card */}
      <View style={[styles.bottomCard, { backgroundColor: appColors.surface, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {isGeocoding ? (
          <View style={styles.addressRow}>
            <ActivityIndicator size={16} color={appColors.brand} />
            <Text variant="bodySmall" style={[styles.addressText, { color: appColors.text.secondary }]}>
              {t('common.loading')}
            </Text>
          </View>
        ) : resolvedAddress ? (
          <View style={styles.addressRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={appColors.brand} />
            <Text variant="bodySmall" style={[styles.addressText, { color: appColors.text.primary }]} numberOfLines={2}>
              {resolvedAddress}
            </Text>
          </View>
        ) : (
          <View style={styles.addressRow}>
            <MaterialCommunityIcons name="map-marker-question-outline" size={18} color={appColors.text.secondary} />
            <Text variant="bodySmall" style={[styles.addressText, { color: appColors.text.secondary }]}>
              {t('addresses.adjustPin')}
            </Text>
          </View>
        )}
        <AppButton
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleConfirm}
          disabled={isGeocoding || !resolvedDetails}
          loading={isGeocoding}
        >
          {t('addresses.confirmLocation')}
        </AppButton>
      </View>
    </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    ...elevation.level2,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  mapContainer: {
    flex: 1,
  },
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinIcon: {
    marginTop: -48,
  },
  hintBadge: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    ...elevation.level1,
  },
  recenterFab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomCard: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    ...elevation.level3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  addressText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
});
