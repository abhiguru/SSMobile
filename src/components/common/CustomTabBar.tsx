import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, spacing, elevation, fontFamily } from '../../constants/theme';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { height: TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing.sm), paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        // Skip hidden tabs — check both href=null (Expo Router convention)
        // and missing tabBarIcon (screens without icons shouldn't appear)
        if ((options as any).href === null || !options.tabBarIcon) return null;

        const onPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabBarItem
            key={route.key}
            isFocused={isFocused}
            options={options}
          onPress={onPress}
          />
        );
      })}
    </View>
  );
}

function TabBarItem({
  isFocused,
  options,
  onPress,
}: {
  isFocused: boolean;
  options: any;
  onPress: () => void;
}) {
  const iconColor = isFocused ? colors.brand : colors.neutral;
  const badge = options.tabBarBadge;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
    >
      <View style={styles.tabIconWrapper}>
        {options.tabBarIcon?.({ color: iconColor, size: 24, focused: isFocused })}
        {badge != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {typeof badge === 'number' && badge > 9 ? '9+' : badge}
            </Text>
          </View>
        )}
      </View>
      <Text
        variant="labelSmall"
        style={[styles.tabLabel, { color: iconColor }]}
        numberOfLines={1}
      >
        {options.tabBarLabel || options.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...elevation.level4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.badgeRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
    lineHeight: 14,
  },
  tabLabel: {
    marginTop: spacing.xs,
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
  },
});
