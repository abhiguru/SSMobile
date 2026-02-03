import { useState, useCallback } from 'react';
import { Alert, Linking, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

import type { PlaceDetails } from './PlacesAutocomplete';
import { LocationPickerModal } from './LocationPickerModal';
import { spacing } from '../../constants/theme';
import { AppButton } from './AppButton';

interface UseCurrentLocationButtonProps {
  onLocationSelected: (details: PlaceDetails) => void;
}

export function UseCurrentLocationButton({ onLocationSelected }: UseCurrentLocationButtonProps) {
  const { t } = useTranslation();

  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handlePress = useCallback(async () => {
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

      console.log('[UseCurrentLocation] getting GPS position...');
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log('[UseCurrentLocation] GPS lat=%s lng=%s accuracy=%s', position.coords.latitude, position.coords.longitude, position.coords.accuracy);
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      setModalVisible(true);
    } catch (err) {
      console.error('[UseCurrentLocation] GPS error:', err instanceof Error ? err.message : err);
    } finally {
      setIsFetchingGps(false);
    }
  }, [t]);

  const handleConfirm = useCallback((details: PlaceDetails) => {
    setModalVisible(false);
    onLocationSelected(details);
  }, [onLocationSelected]);

  return (
    <>
      <AppButton
        variant="secondary"
        size="md"
        fullWidth
        onPress={handlePress}
        disabled={isFetchingGps}
        loading={isFetchingGps}
        icon="crosshairs-gps"
        style={styles.button}
      >
        {isFetchingGps ? t('addresses.fetchingLocation') : t('addresses.useCurrentLocation')}
      </AppButton>

      <LocationPickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirm}
        initialLatitude={coords?.lat}
        initialLongitude={coords?.lng}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    marginBottom: spacing.md,
  },
});
