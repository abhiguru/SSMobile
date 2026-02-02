import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { spacing, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
import { AppButton } from './AppButton';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { appColors } = useAppTheme();
  const bobY = useSharedValue(0);

  useEffect(() => {
    bobY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [bobY]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <Animated.View style={[styles.iconContainer, { backgroundColor: appColors.shell }, bobStyle]}>
        <MaterialCommunityIcons name={icon} size={64} color={appColors.neutral} />
      </Animated.View>
      <Text variant="titleMedium" style={[styles.title, { color: appColors.text.primary }]}>{title}</Text>
      {subtitle && (
        <Text variant="bodyMedium" style={[styles.subtitle, { color: appColors.text.secondary }]}>{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <AppButton variant="primary" size="lg" onPress={onAction}>
          {actionLabel}
        </AppButton>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: spacing.xl,
  },
});
