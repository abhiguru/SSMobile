import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const LOCATION_TASK_NAME = 'delivery-location-tracking';

// Battery-efficient tracking config
const LOCATION_CONFIG = {
  accuracy: Location.Accuracy.Balanced, // ~100m, battery friendly
  timeInterval: 30000, // Every 30 seconds
  distanceInterval: 50, // Or every 50 meters moved
};

// Callback to be set by the hook
let locationUpdateCallback: ((location: Location.LocationObject) => void) | null = null;

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log('[Location] Background task error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latestLocation = locations[locations.length - 1];
    console.log('[Location] Background update:', latestLocation.coords.latitude, latestLocation.coords.longitude);

    if (locationUpdateCallback) {
      locationUpdateCallback(latestLocation);
    }
  }
});

export function setLocationUpdateCallback(callback: ((location: Location.LocationObject) => void) | null) {
  locationUpdateCallback = callback;
}

export async function requestLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  console.log('[Location] Requesting permissions...');

  // Request foreground permission first
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  console.log('[Location] Foreground permission:', foregroundStatus);

  if (foregroundStatus !== 'granted') {
    return { foreground: false, background: false };
  }

  // Request background permission (for tracking when app is backgrounded)
  let backgroundGranted = false;
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    console.log('[Location] Background permission:', backgroundStatus);
    backgroundGranted = backgroundStatus === 'granted';
  }

  return { foreground: true, background: backgroundGranted };
}

export async function checkLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
  const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();

  return {
    foreground: foregroundStatus === 'granted',
    background: backgroundStatus === 'granted',
  };
}

export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    console.log('[Location] Current location:', location.coords.latitude, location.coords.longitude);
    return location;
  } catch (error) {
    console.log('[Location] Error getting current location:', error);
    return null;
  }
}

export async function startLocationTracking(): Promise<boolean> {
  console.log('[Location] Starting tracking...');

  try {
    const { foreground, background } = await checkLocationPermissions();
    if (!foreground) {
      console.log('[Location] No foreground permission, cannot start tracking');
      return false;
    }

    // Check if already tracking
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      console.log('[Location] Already tracking');
      return true;
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: LOCATION_CONFIG.accuracy,
      timeInterval: LOCATION_CONFIG.timeInterval,
      distanceInterval: LOCATION_CONFIG.distanceInterval,
      foregroundService: {
        notificationTitle: 'Delivery Tracking Active',
        notificationBody: 'Your location is being shared with customers',
        notificationColor: '#f69000',
      },
      // Continue tracking even when app is killed (Android)
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true, // iOS blue bar
    });

    console.log('[Location] Tracking started successfully');
    return true;
  } catch (error) {
    console.log('[Location] Error starting tracking:', error);
    return false;
  }
}

export async function stopLocationTracking(): Promise<void> {
  console.log('[Location] Stopping tracking...');

  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('[Location] Tracking stopped');
    } else {
      console.log('[Location] Was not tracking');
    }
  } catch (error) {
    console.log('[Location] Error stopping tracking:', error);
  }
}

export async function isLocationTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
}
