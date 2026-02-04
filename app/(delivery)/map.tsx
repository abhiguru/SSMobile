import { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Card, ActivityIndicator, Switch } from 'react-native-paper';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGetOrdersQuery } from '../../src/store/apiSlice';
import { formatPrice } from '../../src/constants';
import { spacing, borderRadius, fontFamily } from '../../src/constants/theme';
import { Order } from '../../src/types';
import { AppButton } from '../../src/components/common/AppButton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { useDeliveryLocation } from '../../src/hooks/useDeliveryLocation';
import { useAppTheme, useThemeMode } from '../../src/theme';

// Default region (Ahmedabad, Gujarat)
const DEFAULT_REGION = {
  latitude: 23.0225,
  longitude: 72.5714,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function DeliveryMapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { appColors } = useAppTheme();
  const { isDark } = useThemeMode();
  const mapRef = useRef<MapView>(null);
  const { data: orders = [], isLoading } = useGetOrdersQuery();
  const {
    isTracking,
    currentLocation,
    permissionStatus,
    startTracking,
    stopTracking,
    requestPermissions,
  } = useDeliveryLocation();

  const activeDeliveries = orders.filter((o) => o.status === 'out_for_delivery');

  const handleToggleTracking = async () => {
    if (isTracking) {
      await stopTracking();
    } else {
      await startTracking();
    }
  };

  const handleNavigateToOrder = (order: Order) => {
    if (!order.delivery_address) return;

    // Build navigation URL
    const address = encodeURIComponent(order.delivery_address);
    const url = Platform.select({
      ios: `maps:0,0?q=${address}`,
      android: `google.navigation:q=${address}`,
      default: `https://www.google.com/maps/search/?api=1&query=${address}`,
    });

    Linking.openURL(url!);
  };

  const handleFitToMarkers = useCallback(() => {
    if (!mapRef.current || activeDeliveries.length === 0) return;

    // For now, center on current location if available
    if (currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [activeDeliveries.length, currentLocation]);

  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  }, [currentLocation]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: appColors.shell }]}>
        <ActivityIndicator size="large" color={appColors.brand} />
      </View>
    );
  }

  if (activeDeliveries.length === 0) {
    return <EmptyState icon="map-marker-off" title={t('delivery.noActiveDeliveries')} />;
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        } : DEFAULT_REGION}
        showsUserLocation={true}
        showsMyLocationButton={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {activeDeliveries.map((order, index) => {
          // Note: In a real implementation, orders would have lat/lng from addresses
          // For now, we show a placeholder marker near current location
          if (!currentLocation) return null;

          // Offset markers slightly for demo
          const lat = currentLocation.latitude + (index * 0.005);
          const lng = currentLocation.longitude + (index * 0.003);

          return (
            <Marker
              key={order.id}
              coordinate={{ latitude: lat, longitude: lng }}
              pinColor={appColors.brand}
            >
              <View style={[styles.customMarker, { backgroundColor: appColors.brand }]}>
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
              <Callout tooltip onPress={() => router.push(`/(delivery)/${order.id}`)}>
                <Card style={styles.calloutCard}>
                  <Card.Content style={styles.calloutContent}>
                    <Text variant="titleSmall" style={styles.calloutTitle}>
                      #{order.order_number || order.id.slice(0, 8)}
                    </Text>
                    <Text variant="bodySmall" numberOfLines={2} style={styles.calloutAddress}>
                      {order.delivery_address}
                    </Text>
                    <Text variant="labelMedium" style={[styles.calloutPrice, { color: appColors.brand }]}>
                      {formatPrice(order.total_paise)}
                    </Text>
                    <View style={styles.calloutActions}>
                      <AppButton
                        variant="secondary"
                        size="sm"
                        icon="navigation"
                        onPress={() => handleNavigateToOrder(order)}
                      >
                        {t('delivery.navigateTo')}
                      </AppButton>
                    </View>
                  </Card.Content>
                </Card>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Location tracking toggle */}
      <Card style={[styles.trackingCard, { backgroundColor: appColors.surface }]}>
        <Card.Content style={styles.trackingContent}>
          <View style={styles.trackingInfo}>
            <MaterialCommunityIcons
              name={isTracking ? 'map-marker-check' : 'map-marker-off'}
              size={24}
              color={isTracking ? appColors.positive : appColors.neutral}
            />
            <View style={styles.trackingText}>
              <Text variant="bodyMedium" style={{ color: appColors.text.primary }}>
                {t('delivery.locationSharing')}
              </Text>
              <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>
                {isTracking ? t('delivery.sharingActive') : t('delivery.sharingInactive')}
              </Text>
            </View>
          </View>
          <Switch
            value={isTracking}
            onValueChange={handleToggleTracking}
            color={appColors.positive}
          />
        </Card.Content>
      </Card>

      {/* Order count badge */}
      <View style={[styles.countBadge, { backgroundColor: appColors.brand }]}>
        <Text style={styles.countText}>
          {activeDeliveries.length} {t('delivery.deliveries').toLowerCase()}
        </Text>
      </View>

      {/* My location button */}
      <View style={styles.myLocationButton}>
        <AppButton
          variant="secondary"
          size="sm"
          icon="crosshairs-gps"
          onPress={handleFitToMarkers}
        >
          {' '}
        </AppButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  calloutCard: {
    width: 200,
    borderRadius: borderRadius.md,
  },
  calloutContent: {
    padding: spacing.sm,
  },
  calloutTitle: {
    fontFamily: fontFamily.bold,
    marginBottom: spacing.xs,
  },
  calloutAddress: {
    marginBottom: spacing.sm,
  },
  calloutPrice: {
    fontFamily: fontFamily.bold,
    marginBottom: spacing.sm,
  },
  calloutActions: {
    flexDirection: 'row',
  },
  trackingCard: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  trackingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trackingText: {
    gap: 2,
  },
  countBadge: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  countText: {
    color: '#fff',
    fontFamily: fontFamily.semiBold,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
  },
});
