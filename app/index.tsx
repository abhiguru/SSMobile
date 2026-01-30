import { Redirect } from 'expo-router';

import { useAppSelector } from '../src/store';
import { LoadingScreen } from '../src/components/common/LoadingScreen';

export default function EntryScreen() {
  const { isAuthenticated, isLoading, user, role: stateRole } = useAppSelector((state) => state.auth);

  console.log('[EntryScreen] isLoading:', isLoading, 'isAuthenticated:', isAuthenticated,
    'user?.role:', user?.role, 'state.role:', stateRole, 'user:', JSON.stringify(user));

  if (isLoading) {
    console.log('[EntryScreen] → showing LoadingScreen');
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    console.log('[EntryScreen] → redirecting to login');
    return <Redirect href="/(auth)/login" />;
  }

  const role = user?.role || 'customer';
  console.log('[EntryScreen] resolved role:', role);

  if (role === 'admin') {
    console.log('[EntryScreen] → redirecting to /(admin)');
    return <Redirect href="/(admin)" />;
  }

  if (role === 'delivery_staff') {
    console.log('[EntryScreen] → redirecting to /(delivery)');
    return <Redirect href="/(delivery)" />;
  }

  console.log('[EntryScreen] → redirecting to /(customer)');
  return <Redirect href="/(customer)" />;
}
