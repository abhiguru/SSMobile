import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { spacing, borderRadius, elevation, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface SectionCardProps {
  title?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  accent?: boolean;
  children: React.ReactNode;
}

export function SectionCard({ title, icon, accent, children }: SectionCardProps) {
  const { appColors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface, borderColor: appColors.border }, accent && { borderLeftWidth: 3, borderLeftColor: appColors.brand }]}>
      {title && (
        <View style={styles.titleRow}>
          {icon && (
            <MaterialCommunityIcons name={icon} size={20} color={appColors.brand} style={styles.icon} />
          )}
          <Text variant="titleMedium" style={[styles.title, { color: appColors.text.primary }]}>{title}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    marginBottom: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...elevation.level2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.semiBold,
  },
});
