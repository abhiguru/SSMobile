import { Redirect } from 'expo-router';

import { useAppSelector } from '../src/store';
import { LoadingScreen } from '../src/components/common/LoadingScreen';

export default function EntryScreen() {
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const role = user?.role || 'customer';

  if (role === 'admin') {
    return <Redirect href="/(admin)" />;
  }

  if (role === 'delivery_staff') {
    return <Redirect href="/(delivery)" />;
  }

  return <Redirect href="/(customer)" />;
}
