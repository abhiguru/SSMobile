import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '../../src/constants/theme';

export default function StaffScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <MaterialCommunityIcons name="account-group" size={64} color={colors.neutral} />
        <Text variant="headlineSmall" style={styles.title}>{t('admin.staff')}</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>{t('admin.staffComingSoon')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  title: { fontWeight: 'bold', color: colors.text.primary, marginTop: spacing.md, marginBottom: spacing.sm },
  subtitle: { color: colors.text.secondary },
});
