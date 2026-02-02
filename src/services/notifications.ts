import type * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detect if running in Expo Go (notifications removed from Expo Go in SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-load expo-notifications to avoid crash in Expo Go
let Notifications: typeof ExpoNotifications | null = null;

if (!isExpoGo) {
  Notifications = require('expo-notifications') as typeof ExpoNotifications;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  console.log('[Push] registerForPushNotificationsAsync called');
  console.log('[Push] isExpoGo:', isExpoGo, 'Notifications loaded:', !!Notifications);

  if (!Notifications) {
    console.log('[Push] ABORT — Notifications module not loaded (Expo Go)');
    return null;
  }

  let token: string | null = null;

  if (!Device.isDevice) {
    console.log('[Push] ABORT — not a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  console.log('[Push] existing permission status:', existingStatus);

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('[Push] requested permission, new status:', finalStatus);
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] ABORT — permission not granted:', finalStatus);
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? Constants.easConfig?.projectId
      ?? 'your-project-id';
    console.log('[Push] using projectId:', projectId);

    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = pushToken.data;
    console.log('[Push] obtained token:', token);
  } catch (error) {
    console.error('[Push] ERROR getting push token:', error);
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f69000',
    });

    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Notifications about your order status',
    });
  }

  return token;
}

export function addNotificationListener(
  callback: (notification: ExpoNotifications.Notification) => void
) {
  if (!Notifications) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: ExpoNotifications.NotificationResponse) => void
) {
  if (!Notifications) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function schedulePushNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!Notifications) {
    console.log('Notifications not available in Expo Go:', { title, body });
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null,
  });
}
