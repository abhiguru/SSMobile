import { View, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, fontFamily, fontSize } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, actionLabel, onAction, style }: SectionHeaderProps) {
  const { appColors } = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: appColors.text.secondary }]}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: appColors.brand }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  action: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
});
