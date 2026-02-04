import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useGetDeliveryTrackingQuery } from '../../store/apiSlice';
import { spacing, borderRadius, fontFamily, elevation } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
import { useThemeMode } from '../../theme/ThemeContext';
import { AppButton } from '../common/AppButton';

interface LiveTrackingCardProps {
  orderId: string;
  customerLat?: number | null;
  customerLng?: number | null;
}

export function LiveTrackingCard({ orderId, customerLat, customerLng }: LiveTrackingCardProps) {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();
  const { isDark } = useThemeMode();
  const mapRef = useRef<MapView>(null);

  const { data: tracking, isLoading, error } = useGetDeliveryTrackingQuery(orderId, {
    pollingInterval: 15000, // Poll every 15 seconds
  });

  const [timeAgo, setTimeAgo] = useState<string>('');

  // Update "time ago" every 30 seconds
  useEffect(() => {
    if (!tracking?.last_updated) return;

    const updateTimeAgo = () => {
      const updated = new Date(tracking.last_updated);
      const now = new Date();
      const diffMs = now.getTime() - updated.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) {
        setTimeAgo(t('delivery.tracking.justNow'));
      } else if (diffMins === 1) {
        setTimeAgo(t('delivery.tracking.lastUpdated', { time: '1 min' }));
      } else {
        setTimeAgo(t('delivery.tracking.lastUpdated', { time: `${diffMins} min` }));
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000);
    return () => clearInterval(interval);
  }, [tracking?.last_updated, t]);

  // Fit map to markers when data updates
  useEffect(() => {
    if (!mapRef.current || !tracking?.staff_location) return;

    const coords = [
      {
        latitude: tracking.staff_location.latitude,
        longitude: tracking.staff_location.longitude,
      },
    ];

    if (customerLat && customerLng) {
      coords.push({ latitude: customerLat, longitude: customerLng });
    }

    if (coords.length >= 1) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [tracking?.staff_location, customerLat, customerLng]);

  const handleCallStaff = () => {
    if (!tracking?.staff_phone) return;
    Linking.openURL(`tel:${tracking.staff_phone}`);
  };

  if (isLoading && !tracking) {
    return (
      <Card style={[styles.card, { backgroundColor: appColors.surface }]}>
        <Card.Content style={styles.loadingContent}>
          <ActivityIndicator size="small" color={appColors.brand} />
          <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginLeft: spacing.sm }}>
            {t('common.loading')}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  if (error || !tracking) {
    return null;
  }

  const hasStaffLocation = tracking.staff_location !== null;

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Card style={[styles.card, { backgroundColor: appColors.surface }]} mode="elevated">
        <Card.Content style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.statusDot, { backgroundColor: appColors.positive }]} />
            <Text variant="titleSmall" style={[styles.title, { color: appColors.text.primary }]}>
              {t('delivery.tracking.onTheWay')}
            </Text>
            {tracking.eta_minutes && (
              <Text variant="labelMedium" style={[styles.eta, { color: appColors.brand }]}>
                {t('delivery.tracking.eta', { minutes: tracking.eta_minutes })}
              </Text>
            )}
          </View>

          {/* Map */}
          {hasStaffLocation && (
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                userInterfaceStyle={isDark ? 'dark' : 'light'}
                initialRegion={{
                  latitude: tracking.staff_location!.latitude,
                  longitude: tracking.staff_location!.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
              >
                {/* Delivery staff marker */}
                <Marker
                  coordinate={{
                    latitude: tracking.staff_location!.latitude,
                    longitude: tracking.staff_location!.longitude,
                  }}
                >
                  <View style={[styles.staffMarker, { backgroundColor: appColors.brand }]}>
                    <MaterialCommunityIcons name="truck-delivery" size={20} color="#fff" />
                  </View>
                </Marker>

                {/* Customer location marker */}
                {customerLat && customerLng && (
                  <Marker
                    coordinate={{
                      latitude: customerLat,
                      longitude: customerLng,
                    }}
                  >
                    <View style={[styles.customerMarker, { backgroundColor: appColors.positive }]}>
                      <MaterialCommunityIcons name="home" size={16} color="#fff" />
                    </View>
                  </Marker>
                )}
              </MapView>
            </View>
          )}

          {/* Staff info */}
          <View style={[styles.staffInfo, { borderTopColor: appColors.border }]}>
            <View style={styles.staffDetails}>
              <View style={[styles.avatar, { backgroundColor: appColors.brandLight }]}>
                <MaterialCommunityIcons name="account" size={24} color={appColors.brand} />
              </View>
              <View style={styles.staffText}>
                <Text variant="bodyMedium" style={{ color: appColors.text.primary, fontFamily: fontFamily.semiBold }}>
                  {tracking.staff_name}
                </Text>
                <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>
                  {t('delivery.tracking.deliveryPersonLocation')}
                </Text>
                {timeAgo && (
                  <Text variant="labelSmall" style={{ color: appColors.neutral, marginTop: 2 }}>
                    {timeAgo}
                  </Text>
                )}
              </View>
            </View>
            {tracking.staff_phone && (
              <AppButton variant="secondary" size="sm" icon="phone" onPress={handleCallStaff}>
                {t('delivery.tracking.call')}
              </AppButton>
            )}
          </View>
        </Card.Content>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  content: {
    padding: 0,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    flex: 1,
  },
  eta: {
    fontFamily: fontFamily.bold,
  },
  mapContainer: {
    height: 180,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  staffMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...elevation.level3,
  },
  customerMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  staffDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffText: {
    flex: 1,
  },
});
