import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';

import { useAppSelector } from '../src/store';

export default function Index() {
  const { isAuthenticated, isLoading, role } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
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
