import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { I18nextProvider } from 'react-i18next';
import { useFonts } from 'expo-font';

import { store, useAppDispatch, useAppSelector } from '../src/store';
import i18n from '../src/i18n';
import { paperTheme } from '../src/theme';
import { checkSession } from '../src/store/slices/authSlice';
import { loadFavorites, syncFavoritesWithBackend } from '../src/store/slices/productsSlice';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { ToastProvider } from '../src/components/common/Toast';
import { registerForPushNotificationsAsync } from '../src/services/notifications';
import { registerPushToken } from '../src/services/supabase';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Initial app setup
  useEffect(() => {
    dispatch(checkSession());
    dispatch(loadFavorites());
  }, [dispatch]);

  // Post-authentication setup
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(syncFavoritesWithBackend());

      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          registerPushToken(token);
        }
      });
    }
  }, [dispatch, isAuthenticated]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    '72-Regular': require('../assets/fonts/72-Regular.ttf'),
    '72-SemiBold': require('../assets/fonts/72-SemiBold.ttf'),
    '72-Bold': require('../assets/fonts/72-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
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
    </View>
  );
}
