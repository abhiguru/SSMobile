import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { ActivityIndicator, useTheme } from 'react-native-paper';

import { useAppSelector } from '../src/store';
import type { AppTheme } from '../src/theme';

export default function Index() {
  const { isAuthenticated, isLoading, role } = useAppSelector((state) => state.auth);
  const theme = useTheme<AppTheme>();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  switch (role) {
    case 'admin':
    case 'super_admin':
      return <Redirect href="/(admin)" />;
    case 'delivery_staff':
      return <Redirect href="/(delivery)" />;
    case 'customer':
    default:
      return <Redirect href="/(customer)" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
