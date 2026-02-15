import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

import { store, useAppSelector, useAppDispatch } from '../src/store';
import i18n from '../src/i18n';
import { ThemeProvider, useThemeMode } from '../src/theme';
import { apiSlice, useCheckSessionMutation, useGetFavoritesQuery } from '../src/store/apiSlice';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { registerForPushNotificationsAsync, addNotificationListener, addNotificationResponseListener } from '../src/services/notifications';
import { registerPushToken } from '../src/services/supabase';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [checkSession] = useCheckSessionMutation();
  // Use RTK Query for favorites - remove syncFavorites mutation to avoid duplicate fetch
  const favQuery = useGetFavoritesQuery(undefined, { skip: !isAuthenticated });
  const dispatch = useAppDispatch();
  const router = useRouter();
  const wasAuthenticated = useRef(false);
  const pushRegistrationAttempted = useRef(false);
  const sessionCheckCompleted = useRef(false);

  console.log('[Favorites:AppInit] render — isAuthenticated:', isAuthenticated,
    'isLoading:', isLoading, 'favStatus:', favQuery.status, 'favIds:', favQuery.data?.length ?? 'undefined');

  // Initial app setup
  useEffect(() => {
    console.log('[Favorites:AppInit] mount effect — calling checkSession');
    sessionCheckCompleted.current = false;
    checkSession().finally(() => {
      sessionCheckCompleted.current = true;
      console.log('[AppInit] checkSession completed');
    });
  }, [checkSession]);

  // Post-authentication setup
  useEffect(() => {
    console.log('[AppInit:auth] effect — isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'wasAuthenticated.current:', wasAuthenticated.current, 'sessionCheckCompleted:', sessionCheckCompleted.current);

    // Don't do anything while still loading or session check hasn't completed
    if (isLoading || !sessionCheckCompleted.current) {
      console.log('[AppInit:auth] still loading or session check pending, skipping');
      return;
    }

    if (isAuthenticated) {
      wasAuthenticated.current = true;
      // Favorites now automatically fetched via useGetFavoritesQuery with skip: !isAuthenticated

      // Defer push notification registration to avoid blocking UI
      // Only attempt once per session to avoid repeated permission dialogs
      if (!pushRegistrationAttempted.current) {
        pushRegistrationAttempted.current = true;
        // Use requestIdleCallback pattern - defer to after initial render settles
        const timeoutId = setTimeout(() => {
          registerForPushNotificationsAsync().then((token) => {
            console.log('[Push] registerForPushNotificationsAsync result:', token ? `token obtained (${token.substring(0, 30)}...)` : 'null (no token)');
            if (token) {
              registerPushToken(token).then((ok) => {
                console.log('[Push] registerPushToken result:', ok ? 'SUCCESS' : 'FAILED');
              });
            }
          }).catch((err) => {
            console.error('[Push] registration error:', err);
          });
        }, 1000); // Defer by 1 second to let UI settle
        return () => clearTimeout(timeoutId);
      }
    } else if (wasAuthenticated.current) {
      console.log('[AppInit:auth] ⚠️ LOGOUT TRIGGERED — wasAuthenticated was true but isAuthenticated is now false');
      wasAuthenticated.current = false;
      router.replace('/(auth)/login');
    } else {
      console.log('[AppInit:auth] not authenticated (no previous session)');
    }
  }, [isAuthenticated, isLoading, router]);

  // Notification listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // Foreground: invalidate order caches so lists and detail screens auto-refresh
    const notificationSub = addNotificationListener((notification) => {
      const data = notification.request.content.data as Record<string, string> | undefined;
      console.log('[Notification:foreground] received — title:', notification.request.content.title);
      console.log('[Notification:foreground] data:', JSON.stringify(data));

      if (!data) {
        console.log('[Notification:foreground] no data payload, skipping invalidation');
        return;
      }

      // Invalidate on any order-related notification type, or any notification with an order_id
      const isOrderRelated =
        data.type === 'order_update' ||
        data.type === 'order_status_update' ||
        data.type === 'new_order' ||
        data.type === 'delivery_assignment' ||
        !!data.order_id;

      console.log('[Notification:foreground] type:', data.type, 'order_id:', data.order_id, 'isOrderRelated:', isOrderRelated);

      if (isOrderRelated) {
        const tags: Array<{ type: 'Order'; id: string } | 'Orders'> = ['Orders'];
        if (data.order_id) {
          tags.push({ type: 'Order', id: data.order_id });
        }
        console.log('[Notification:foreground] invalidating tags:', JSON.stringify(tags));
        dispatch(apiSlice.util.invalidateTags(tags));
      } else {
        console.log('[Notification:foreground] not order-related, no invalidation');
      }
    });

    // Tap/response: navigate to the appropriate screen
    const responseSub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data?.type) return;

      switch (data.type) {
        case 'order_update':
          router.push(data.order_id ? `/(customer)/orders/${data.order_id}` : '/(customer)/orders');
          break;
        case 'new_order':
          router.push(data.order_id ? `/(admin)/orders/${data.order_id}` : '/(admin)/orders');
          break;
        case 'delivery_assignment':
          router.push(data.order_id ? `/(delivery)/${data.order_id}` : '/(delivery)');
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

function ThemedApp() {
  const { theme, isDark } = useThemeMode();

  return (
    <PaperProvider theme={theme}>
      <I18nextProvider i18n={i18n}>
        <AppInitializer>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(customer)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(admin)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(delivery)" options={{ animation: 'fade' }} />
          </Stack>
        </AppInitializer>
      </I18nextProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    '72-Regular': require('../assets/fonts/72-Regular.ttf'),
    '72-SemiBold': require('../assets/fonts/72-SemiBold.ttf'),
    '72-Bold': require('../assets/fonts/72-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <Provider store={store}>
            <ThemeProvider>
              <ThemedApp />
            </ThemeProvider>
          </Provider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
