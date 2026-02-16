import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { fontFamily } from '../../src/constants/theme';
import { CustomTabBar } from '../../src/components/common/CustomTabBar';
import { useAppTheme } from '../../src/theme/useAppTheme';

export default function DeliveryLayout() {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: appColors.brand,
        tabBarInactiveTintColor: appColors.neutral,
        headerStyle: {
          backgroundColor: appColors.surface,
          borderBottomWidth: 1,
          borderBottomColor: appColors.border,
        },
        headerTintColor: appColors.text.primary,
        headerTitleStyle: {
          fontFamily: fontFamily.semiBold,
          fontSize: 17,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('delivery.currentDeliveries'),
          tabBarLabel: t('delivery.deliveries'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'truck-delivery' : 'truck-delivery-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen
        name="history"
        options={{
          title: t('delivery.history'),
          tabBarLabel: t('delivery.history'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'history' : 'history'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('profile.title'),
          tabBarLabel: t('profile.title'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'cog' : 'cog-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen name="[id]" options={{ href: null, title: t('delivery.deliveryDetails') }} />
    </Tabs>
  );
}
