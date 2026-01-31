import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fontFamily } from '../../src/constants/theme';
import { CustomTabBar } from '../../src/components/common/CustomTabBar';

export default function AdminLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.neutral,
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontFamily: fontFamily.semiBold,
          fontSize: 17,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('admin.dashboard'), tabBarLabel: 'Dashboard', tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'view-dashboard' : 'view-dashboard-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="products" options={{ title: t('admin.products'), tabBarLabel: 'Products', tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'leaf' : 'leaf'} color={color} size={size} />, headerShown: false }} />
      <Tabs.Screen name="orders" options={{ title: t('admin.orders'), tabBarLabel: 'Orders', tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'package-variant' : 'package-variant-closed'} color={color} size={size} />, headerShown: false }} />
      <Tabs.Screen name="staff" options={{ title: t('admin.staff'), tabBarLabel: 'Staff', tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'account-group' : 'account-group-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="users" options={{ title: t('admin.usersTitle'), tabBarLabel: 'Users', tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'account-cog' : 'account-cog-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: t('admin.settings'), tabBarLabel: 'Settings', tabBarIcon: ({ color, size, focused }) => <MaterialCommunityIcons name={focused ? 'cog' : 'cog-outline'} color={color} size={size} /> }} />
    </Tabs>
  );
}
