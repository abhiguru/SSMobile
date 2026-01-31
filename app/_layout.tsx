import { useEffect, useRef, useCallback } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

import { store, useAppSelector, useAppDispatch } from '../src/store';
import i18n from '../src/i18n';
import { paperTheme } from '../src/theme';
import { apiSlice, useCheckSessionMutation, useGetFavoritesQuery, useSyncFavoritesMutation } from '../src/store/apiSlice';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { ToastProvider } from '../src/components/common/Toast';
import { registerForPushNotificationsAsync, addNotificationListener, addNotificationResponseListener } from '../src/services/notifications';
import { registerPushToken } from '../src/services/supabase';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [checkSession] = useCheckSessionMutation();
  const favQuery = useGetFavoritesQuery();
  const [syncFavorites] = useSyncFavoritesMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const wasAuthenticated = useRef(false);

  console.log('[Favorites:AppInit] render — isAuthenticated:', isAuthenticated,
    'favStatus:', favQuery.status, 'favIds:', favQuery.data?.length ?? 'undefined');

  // Initial app setup
  useEffect(() => {
    console.log('[Favorites:AppInit] mount effect — calling checkSession');
    checkSession();
  }, [checkSession]);

  // Post-authentication setup
  useEffect(() => {
    console.log('[Favorites:AppInit] auth effect — isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      wasAuthenticated.current = true;
      console.log('[Favorites:AppInit] calling syncFavorites');
      syncFavorites();

      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          registerPushToken(token);
        }
      });
    } else if (wasAuthenticated.current) {
      wasAuthenticated.current = false;
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, syncFavorites, router]);

  // Notification listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // Foreground: invalidate order caches so lists and detail screens auto-refresh
    const notificationSub = addNotificationListener((notification) => {
      const data = notification.request.content.data as Record<string, string> | undefined;
      if (data?.type === 'order_update' || data?.type === 'new_order') {
        const tags: Array<{ type: 'Order'; id: string } | 'Orders'> = ['Orders'];
        if (data.order_id) {
          tags.push({ type: 'Order', id: data.order_id });
        }
        dispatch(apiSlice.util.invalidateTags(tags));
      }
    });

    // Tap/response: navigate to the appropriate screen
    const responseSub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data?.type) return;

      switch (data.type) {
        case 'order_update':
          router.push('/(customer)/orders');
          break;
        case 'new_order':
          router.push('/(admin)/orders');
          break;
        case 'delivery_assignment':
          router.push('/(delivery)');
          break;
      }
    });

    return () => {
      notificationSub.remove();
      responseSub.remove();
    };
  }, [isAuthenticated, dispatch, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    '72-Regular': require('../assets/fonts/72-Regular.ttf'),
    '72-SemiBold': require('../assets/fonts/72-SemiBold.ttf'),
    '72-Bold': require('../assets/fonts/72-Bold.ttf'),
  });

  const onLayoutReady = useCallback(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutReady}>
      <ErrorBoundary>
        <Provider store={store}>
          <PaperProvider theme={paperTheme}>
            <I18nextProvider i18n={i18n}>
              <AppInitializer>
                <ToastProvider>
                  <StatusBar style="dark" />
                  <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(customer)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(admin)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(delivery)" options={{ animation: 'fade' }} />
                  </Stack>
                </ToastProvider>
              </AppInitializer>
            </I18nextProvider>
          </PaperProvider>
        </Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
