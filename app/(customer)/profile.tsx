import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Button, List, Divider, Switch, Avatar, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { apiSlice } from '../../src/store/apiSlice';
import { changeLanguage } from '../../src/i18n';
import { colors, spacing } from '../../src/constants/theme';
import type { AppTheme } from '../../src/theme';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();
  const { user } = useAppSelector((state) => state.auth);
  const isGujarati = i18n.language === 'gu';

  const handleLogout = async () => {
    await dispatch(logout());
    dispatch(apiSlice.util.resetApiState());
    router.replace('/');
  };

  const handleLanguageToggle = async () => {
    const newLanguage = isGujarati ? 'en' : 'gu';
    await changeLanguage(newLanguage);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon size={80} icon="account" style={{ backgroundColor: theme.colors.primaryContainer }} />
        <Text variant="titleMedium" style={styles.name}>{user?.name || t('profile.guest')}</Text>
        <Text variant="bodyMedium" style={styles.phone}>{user?.phone || ''}</Text>
      </View>

      <View style={styles.section}>
        <List.Item
          title={t('profile.language')}
          right={() => (
            <View style={styles.languageToggle}>
              <Text variant="bodyMedium" style={[styles.languageText, !isGujarati && styles.languageActive]}>EN</Text>
              <Switch value={isGujarati} onValueChange={handleLanguageToggle} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={[styles.languageText, isGujarati && styles.languageActive]}>gu</Text>
            </View>
          )}
        />
        <Divider />
        <List.Item title={t('profile.savedAddresses')} left={() => <List.Icon icon="map-marker" />} right={() => <List.Icon icon="chevron-right" />} onPress={() => router.push('/(customer)/addresses')} />
        <Divider />
        <List.Item title={t('profile.notifications')} left={() => <List.Icon icon="bell-outline" />} right={() => <List.Icon icon="chevron-right" />} />
        <Divider />
        <List.Item title={t('profile.aboutUs')} left={() => <List.Icon icon="information" />} right={() => <List.Icon icon="chevron-right" />} />
        <Divider />
        <List.Item title={t('profile.help')} left={() => <List.Icon icon="help-circle" />} right={() => <List.Icon icon="chevron-right" />} />
      </View>

      <Button mode="text" textColor={theme.colors.error} onPress={handleLogout} style={styles.logoutButton} labelStyle={styles.logoutLabel}>
        {t('auth.logout')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: { backgroundColor: colors.background.primary, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  name: { fontWeight: '600', color: colors.text.primary, marginTop: 12, marginBottom: spacing.xs },
  phone: { color: colors.text.secondary },
  section: { backgroundColor: colors.background.primary, marginBottom: spacing.md },
  languageToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  languageText: { color: colors.text.muted },
  languageActive: { color: colors.primary, fontWeight: '600' },
  logoutButton: { backgroundColor: colors.background.primary },
  logoutLabel: { fontSize: 16, fontWeight: '600' },
});
