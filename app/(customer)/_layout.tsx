import { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View, Pressable } from 'react-native';
import { Badge } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { useAppSelector } from '../../src/store';
import { selectCartItemCount } from '../../src/store/slices/cartSlice';
import { colors, fontFamily } from '../../src/constants/theme';
import { CustomTabBar } from '../../src/components/common/CustomTabBar';

const CartBadge = () => {
  const count = useAppSelector(selectCartItemCount);
  const prevCount = useRef(count);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (count > prevCount.current) {
      scale.value = withSequence(
        withSpring(1.5, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 300 })
      );
    }
    prevCount.current = count;
  }, [count, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (count === 0) return null;
  return (
    <Animated.View style={[{ position: 'absolute', top: -4, right: -8 }, animatedStyle]}>
      <Badge
        size={18}
        style={{ backgroundColor: colors.brand, color: colors.text.inverse }}
      >
        {count > 9 ? '9+' : count}
      </Badge>
    </Animated.View>
  );
};

const HeaderCartButton = () => {
  const count = useAppSelector(selectCartItemCount);
  const prevCount = useRef(count);
  const scale = useSharedValue(1);
  const router = useRouter();

  useEffect(() => {
    if (count > prevCount.current) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 300 })
      );
    }
    prevCount.current = count;
  }, [count, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={() => router.push('/(customer)/cart')} style={{ marginRight: 16 }}>
      <Animated.View style={animatedStyle}>
        <MaterialCommunityIcons name="cart-outline" size={24} color={colors.text.primary} />
        {count > 0 && (
          <Badge
            size={16}
            style={{
              position: 'absolute',
              top: -6,
              right: -10,
              backgroundColor: colors.negative,
              color: colors.text.inverse,
            }}
          >
            {count > 9 ? '9+' : count}
          </Badge>
        )}
      </Animated.View>
    </Pressable>
  );
};

export default function CustomerLayout() {
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
        headerRight: () => <HeaderCartButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.title'),
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('cart.title'),
          tabBarLabel: 'Cart',
          headerRight: () => null,
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <MaterialCommunityIcons name={focused ? 'cart' : 'cart-outline'} color={color} size={size} />
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
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'package-variant' : 'package-variant-closed'} color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('favorites.title'),
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'heart' : 'heart-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarLabel: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'account' : 'account-outline'} color={color} size={size} />
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
