import * as Location from 'expo-location';

// Battery-efficient tracking config
const LOCATION_CONFIG = {
  accuracy: Location.Accuracy.Balanced, // ~100m, battery friendly
  timeInterval: 30000, // Every 30 seconds
  distanceInterval: 50, // Or every 50 meters moved
};

// Active subscription for foreground tracking
let locationSubscription: Location.LocationSubscription | null = null;

// Callback to be set by the hook
let locationUpdateCallback: ((location: Location.LocationObject) => void) | null = null;

export function setLocationUpdateCallback(callback: ((location: Location.LocationObject) => void) | null) {
  locationUpdateCallback = callback;
}

export async function requestLocationPermissions(): Promise<boolean> {
  console.log('[Location] Requesting permissions...');

  const { status } = await Location.requestForegroundPermissionsAsync();
  console.log('[Location] Foreground permission:', status);

  return status === 'granted';
}

export async function checkLocationPermissions(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
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
  console.log('[Location] Starting foreground tracking...');

  try {
    const hasPermission = await checkLocationPermissions();
    if (!hasPermission) {
      console.log('[Location] No foreground permission, cannot start tracking');
      return false;
    }

    // Stop existing subscription if any
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }

    // Start foreground location updates
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: LOCATION_CONFIG.accuracy,
        timeInterval: LOCATION_CONFIG.timeInterval,
        distanceInterval: LOCATION_CONFIG.distanceInterval,
      },
      (location) => {
        console.log('[Location] Update:', location.coords.latitude, location.coords.longitude);
        if (locationUpdateCallback) {
          locationUpdateCallback(location);
        }
      }
    );

    console.log('[Location] Foreground tracking started successfully');
    return true;
  } catch (error) {
    console.log('[Location] Error starting tracking:', error);
    return false;
  }
}

export async function stopLocationTracking(): Promise<void> {
  console.log('[Location] Stopping tracking...');

  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
    console.log('[Location] Tracking stopped');
  } else {
    console.log('[Location] Was not tracking');
  }
}

export function isLocationTrackingActive(): boolean {
  return locationSubscription !== null;
}
