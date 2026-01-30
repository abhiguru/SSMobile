import { StyleSheet, ActivityIndicator, View, ViewStyle, StyleProp } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AnimatedPressable } from './AnimatedPressable';
import { colors, spacing, borderRadius, elevation, fontFamily } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  fullWidth?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.brand, text: colors.text.inverse },
  secondary: { bg: colors.surface, text: colors.brand, border: colors.brand },
  outline: { bg: 'transparent', text: colors.brand, border: colors.brand },
  text: { bg: 'transparent', text: colors.brand },
  danger: { bg: colors.negative, text: colors.text.inverse },
};

const SIZE_STYLES: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; iconSize: number }> = {
  sm: { paddingVertical: 6, paddingHorizontal: 12, iconSize: 16 },
  md: { paddingVertical: 10, paddingHorizontal: 20, iconSize: 20 },
  lg: { paddingVertical: 14, paddingHorizontal: 24, iconSize: 24 },
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
  children,
}: AppButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.bg,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          borderWidth: variantStyle.border ? 1.5 : 0,
          borderColor: variantStyle.border || 'transparent',
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        variant !== 'text' && variant !== 'outline' && elevation.level1,
        containerStyle,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={variantStyle.text} style={styles.loader} />
        ) : icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={sizeStyle.iconSize}
            color={variantStyle.text}
            style={styles.icon}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            { color: variantStyle.text },
          ]}
        >
          {children}
        </Text>
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
    fontSize: 14,
  },
});
