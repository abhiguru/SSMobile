import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../src/store';
import i18n from '../src/i18n';
import { checkSession } from '../src/store/slices/authSlice';
import { loadFavorites, syncFavoritesWithBackend } from '../src/store/slices/productsSlice';
import { fetchAddresses } from '../src/store/slices/addressesSlice';
import { fetchAppSettings } from '../src/store/slices/settingsSlice';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { registerForPushNotificationsAsync } from '../src/services/notifications';
import { registerPushToken } from '../src/services/supabase';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Initial app setup
  useEffect(() => {
    dispatch(checkSession());
    dispatch(loadFavorites());
    dispatch(fetchAppSettings());
  }, [dispatch]);

  // Post-authentication setup
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch user addresses
      dispatch(fetchAddresses());

      // Sync favorites with backend
      dispatch(syncFavoritesWithBackend());

      // Register push token
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
  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary>
        <Provider store={store}>
          <I18nextProvider i18n={i18n}>
            <AppInitializer>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(customer)" />
                <Stack.Screen name="(admin)" />
                <Stack.Screen name="(delivery)" />
              </Stack>
            </AppInitializer>
          </I18nextProvider>
        </Provider>
      </ErrorBoundary>
    </View>
  );
}
