import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, StyleSheet } from 'react-native';

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={[styles.icon, focused && styles.iconFocused]}>{name}</Text>
);

export default function DeliveryLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#EEEEEE',
        },
        headerStyle: {
          backgroundColor: '#FF6B35',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('delivery.deliveries'),
          tabBarLabel: 'Deliveries',
          tabBarIcon: ({ focused }) => <TabIcon name="🚚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('delivery.history'),
          tabBarLabel: 'History',
          tabBarIcon: ({ focused }) => <TabIcon name="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="[id]"
        options={{
          href: null, // Hide from tab bar
          title: 'Delivery Details',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 20,
    opacity: 0.7,
  },
  iconFocused: {
    opacity: 1,
  },
});
