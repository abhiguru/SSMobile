import { View, StyleSheet } from 'react-native';
import { spacing, elevation } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface ToolbarProps {
  children: React.ReactNode;
}

export function Toolbar({ children }: ToolbarProps) {
  const { appColors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface, borderTopColor: appColors.border }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    ...elevation.level2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 56, // Fiori minimum toolbar height
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
});
