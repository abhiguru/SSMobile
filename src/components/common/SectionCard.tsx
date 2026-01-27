import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, elevation, fontFamily } from '../../constants/theme';

interface SectionCardProps {
  title?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  accent?: boolean;
  children: React.ReactNode;
}

export function SectionCard({ title, icon, accent, children }: SectionCardProps) {
  return (
    <View style={[styles.container, accent && styles.accent]}>
      {title && (
        <View style={styles.titleRow}>
          {icon && (
            <MaterialCommunityIcons name={icon} size={20} color={colors.brand} style={styles.icon} />
          )}
          <Text variant="titleMedium" style={styles.title}>{title}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.level2,
  },
  accent: {
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
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
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
  },
});
