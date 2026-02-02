import { useState, useEffect, useRef } from 'react';
import { StyleSheet, ActivityIndicator, View, ViewStyle, StyleProp } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AnimatedPressable } from './AnimatedPressable';
import { spacing, borderRadius, elevation, fontFamily, fontSize } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonStatus = 'idle' | 'loading' | 'success' | 'fail';

interface AppButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  fullWidth?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  status?: ButtonStatus;
  children: React.ReactNode;
}

const SIZE_STYLES: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; iconSize: number; minHeight: number }> = {
  sm: { paddingVertical: 6, paddingHorizontal: 12, iconSize: 16, minHeight: 32 },
  md: { paddingVertical: 10, paddingHorizontal: 20, iconSize: 20, minHeight: 38 },
  lg: { paddingVertical: 14, paddingHorizontal: 24, iconSize: 24, minHeight: 44 },
};

export function AppButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  onPress,
  style: containerStyle,
  status = 'idle',
  children,
}: AppButtonProps) {
  const { appColors } = useAppTheme();

  const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string; pressedBg?: string }> = {
    primary: { bg: appColors.brand, text: appColors.text.inverse, pressedBg: appColors.brandDark },
    secondary: { bg: appColors.surface, text: appColors.brand, border: appColors.brand, pressedBg: appColors.pressedSurface },
    outline: { bg: 'transparent', text: appColors.brand, border: appColors.brand, pressedBg: appColors.pressedSurface },
    text: { bg: 'transparent', text: appColors.brand, pressedBg: appColors.pressedSurface },
    danger: { bg: appColors.negative, text: appColors.text.inverse, pressedBg: appColors.negative + 'CC' },
  };

  const STATUS_ICON: Record<'success' | 'fail', { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; color: string }> = {
    success: { name: 'check', color: appColors.text.inverse },
    fail: { name: 'close', color: appColors.text.inverse },
  };

  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const [pressed, setPressed] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'success' | 'fail' | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === 'success' || status === 'fail') {
      setFeedbackStatus(status);
      timerRef.current = setTimeout(() => setFeedbackStatus(null), 1500);
    } else {
      setFeedbackStatus(null);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [status]);

  const isLoading = loading || status === 'loading';
  const isDisabled = disabled || isLoading || feedbackStatus !== null;

  const bgColor = feedbackStatus === 'success'
    ? appColors.positive
    : feedbackStatus === 'fail'
    ? appColors.negative
    : pressed
    ? (variantStyle.pressedBg || variantStyle.bg)
    : variantStyle.bg;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          minHeight: sizeStyle.minHeight,
          borderWidth: variantStyle.border ? 1.5 : 0,
          borderColor: variantStyle.border || 'transparent',
          opacity: (disabled && !feedbackStatus) ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        variant !== 'text' && variant !== 'outline' && elevation.level1,
        containerStyle,
      ]}
    >
      <View style={styles.content}>
        {feedbackStatus ? (
          <MaterialCommunityIcons
            name={STATUS_ICON[feedbackStatus].name}
            size={sizeStyle.iconSize}
            color={STATUS_ICON[feedbackStatus].color}
          />
        ) : isLoading ? (
          <ActivityIndicator size="small" color={variantStyle.text} style={styles.loader} />
        ) : icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={sizeStyle.iconSize}
            color={variantStyle.text}
            style={styles.icon}
          />
        ) : null}
        {!feedbackStatus && (
          <Text
            style={[
              styles.label,
              { color: variantStyle.text },
            ]}
          >
            {children}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  loader: {
    marginRight: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.body,
  },
});
