import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, elevation } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface ToolbarProps {
  children: React.ReactNode;
}

export function Toolbar({ children }: ToolbarProps) {
  const { appColors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md), backgroundColor: appColors.surface, borderTopColor: appColors.border }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    borderTopWidth: 1,
    ...elevation.level2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
