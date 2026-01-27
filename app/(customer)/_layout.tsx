import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View, Pressable } from 'react-native';
import { Badge } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../src/store';
import { selectCartItemCount } from '../../src/store/slices/cartSlice';
import { colors } from '../../src/constants/theme';

const CartBadge = () => {
  const count = useAppSelector(selectCartItemCount);
  if (count === 0) return null;
  return (
    <Badge
      size={18}
      style={{ position: 'absolute', top: -4, right: -8 }}
    >
      {count > 9 ? '9+' : count}
    </Badge>
  );
};

const HeaderCartButton = () => {
  const count = useAppSelector(selectCartItemCount);
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/(customer)/cart')} style={{ marginRight: 16 }}>
      <View>
        <MaterialCommunityIcons name="cart-outline" size={24} color={colors.text.inverse} />
        {count > 0 && (
          <Badge
            size={16}
            style={{
              position: 'absolute',
              top: -6,
              right: -10,
              backgroundColor: colors.background.primary,
              color: colors.primary,
            }}
          >
            {count > 9 ? '9+' : count}
          </Badge>
        )}
      </View>
    </Pressable>
  );
};

export default function CustomerLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border.light,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <HeaderCartButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.title'),
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('cart.title'),
          tabBarLabel: 'Cart',
          headerRight: () => null,
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialCommunityIcons name="cart" color={color} size={size} />
              <CartBadge />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('orders.title'),
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="package-variant" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('favorites.title'),
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="product/[id]"
        options={{
          href: null,
          title: t('product.details'),
        }}
      />
      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
          title: t('checkout.title'),
          headerRight: () => null,
        }}
      />
      <Tabs.Screen
        name="addresses"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
