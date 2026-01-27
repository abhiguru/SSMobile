import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../src/constants/theme';

export default function DeliveryLayout() {
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
      <Tabs.Screen name="index" options={{ title: t('delivery.activeDeliveries'), tabBarLabel: 'Deliveries', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="truck-delivery" color={color} size={size} /> }} />
      <Tabs.Screen name="history" options={{ title: t('delivery.history'), tabBarLabel: 'History', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="history" color={color} size={size} /> }} />
      <Tabs.Screen name="[id]" options={{ href: null }} />
    </Tabs>
  );
}
