import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, spacing, elevation, fontFamily } from '../../constants/theme';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          // Skip hidden tabs (expo-router uses href=null convention)
          if ((options as any).href === null) return null;

          const onPress = () => {
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

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
    >
      <View style={styles.tabIconWrapper}>
        {options.tabBarIcon?.({ color: iconColor, size: 24, focused: isFocused })}
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
  container: {
    paddingHorizontal: 0,
    paddingTop: spacing.xs,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...elevation.level4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingVertical: spacing.xs,
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    marginTop: 2,
    fontWeight: '600',
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
  },
});
