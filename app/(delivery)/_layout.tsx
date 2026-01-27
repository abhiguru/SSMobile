import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fontFamily } from '../../src/constants/theme';
import { CustomTabBar } from '../../src/components/common/CustomTabBar';

export default function DeliveryLayout() {
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
          fontWeight: 'bold',
          fontFamily: fontFamily.semiBold,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('delivery.currentDeliveries'), tabBarLabel: 'Deliveries', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="truck-delivery" color={color} size={size} /> }} />
      <Tabs.Screen name="history" options={{ title: t('delivery.history'), tabBarLabel: 'History', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="history" color={color} size={size} /> }} />
      <Tabs.Screen name="[id]" options={{ href: null }} />
    </Tabs>
  );
}
