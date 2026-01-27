import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../src/constants/theme';

export default function AdminLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.border.light },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('admin.dashboard'), tabBarLabel: 'Dashboard', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" color={color} size={size} /> }} />
      <Tabs.Screen name="products" options={{ title: t('admin.products'), tabBarLabel: 'Products', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="leaf" color={color} size={size} /> }} />
      <Tabs.Screen name="orders" options={{ title: t('admin.orders'), tabBarLabel: 'Orders', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="package-variant" color={color} size={size} />, headerShown: false }} />
      <Tabs.Screen name="staff" options={{ title: t('admin.staff'), tabBarLabel: 'Staff', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group" color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: t('admin.settings'), tabBarLabel: 'Settings', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog" color={color} size={size} /> }} />
    </Tabs>
  );
}
