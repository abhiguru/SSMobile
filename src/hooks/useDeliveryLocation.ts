import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';

import {
  requestLocationPermissions,
  checkLocationPermissions,
  startLocationTracking,
  stopLocationTracking,
  isLocationTrackingActive,
  setLocationUpdateCallback,
  getCurrentLocation,
} from '../services/locationService';
import { useSendDeliveryLocationMutation } from '../store/apiSlice';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface UseDeliveryLocationReturn {
  isTracking: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  permissionStatus: PermissionStatus;
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

export function useDeliveryLocation(): UseDeliveryLocationReturn {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [sendLocation] = useSendDeliveryLocationMutation();
  const lastSentRef = useRef<number>(0);

  // Check permissions on mount
  useEffect(() => {
    const checkPerms = async () => {
      const perms = await checkLocationPermissions();
      if (perms.foreground) {
        setPermissionStatus('granted');
      } else {
        // Check if we've ever asked
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(status === 'denied' ? 'denied' : 'undetermined');
      }

      // Check if already tracking
      const tracking = await isLocationTrackingActive();
      setIsTracking(tracking);

      // Get current location if we have permission
      if (perms.foreground) {
        const loc = await getCurrentLocation();
        if (loc) {
          setCurrentLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      }
    };

    checkPerms();
  }, []);

  // Set up location update callback
  useEffect(() => {
    const handleLocationUpdate = async (location: Location.LocationObject) => {
      const { latitude, longitude, accuracy } = location.coords;
      setCurrentLocation({ latitude, longitude });

      // Throttle sending to backend (min 20 seconds between updates)
      const now = Date.now();
      if (now - lastSentRef.current >= 20000) {
        lastSentRef.current = now;
        try {
          await sendLocation({
            latitude,
            longitude,
            accuracy: accuracy ?? undefined,
            timestamp: new Date(location.timestamp).toISOString(),
          });
          console.log('[DeliveryLocation] Sent update to backend');
        } catch (error) {
          console.log('[DeliveryLocation] Failed to send update:', error);
        }
      }
    };

    setLocationUpdateCallback(handleLocationUpdate);

    return () => {
      setLocationUpdateCallback(null);
    };
  }, [sendLocation]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const perms = await requestLocationPermissions();
    if (perms.foreground) {
      setPermissionStatus('granted');
      return true;
    } else {
      setPermissionStatus('denied');
      return false;
    }
  }, []);

  const startTrackingFn = useCallback(async (): Promise<boolean> => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) return false;
    }

    const success = await startLocationTracking();
    if (success) {
      setIsTracking(true);
      // Get initial location
      const loc = await getCurrentLocation();
      if (loc) {
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        // Send initial location to backend
        try {
          await sendLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? undefined,
            timestamp: new Date(loc.timestamp).toISOString(),
          });
          lastSentRef.current = Date.now();
        } catch (error) {
          console.log('[DeliveryLocation] Failed to send initial location:', error);
        }
      }
    }
    return success;
  }, [permissionStatus, requestPermissions, sendLocation]);

  const stopTrackingFn = useCallback(async (): Promise<void> => {
    await stopLocationTracking();
    setIsTracking(false);
  }, []);

  return {
    isTracking,
    currentLocation,
    permissionStatus,
    startTracking: startTrackingFn,
    stopTracking: stopTrackingFn,
    requestPermissions,
  };
}
