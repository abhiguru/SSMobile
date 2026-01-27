import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Button, List, Divider, Switch, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { apiSlice } from '../../src/store/apiSlice';
import { changeLanguage } from '../../src/i18n';
import { colors, spacing } from '../../src/constants/theme';
import type { AppTheme } from '../../src/theme';

export default function AdminSettingsScreen() {
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

  const handleLanguageToggle = async () => { await changeLanguage(isGujarati ? 'en' : 'gu'); };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.sectionTitle}>Account</Text>
        <List.Item title="Phone" description={user?.phone || '-'} />
        <Divider />
        <List.Item title="Role" description="Admin" />
      </View>
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.sectionTitle}>Preferences</Text>
        <List.Item title={t('profile.language')} right={() => (
          <View style={styles.languageToggle}>
            <Text variant="bodyMedium" style={[styles.languageText, !isGujarati && styles.languageActive]}>EN</Text>
            <Switch value={isGujarati} onValueChange={handleLanguageToggle} color={theme.colors.primary} />
            <Text variant="bodyMedium" style={[styles.languageText, isGujarati && styles.languageActive]}>gu</Text>
          </View>
        )} />
      </View>
      <Button mode="text" textColor={theme.colors.error} onPress={handleLogout} style={styles.logoutButton} labelStyle={styles.logoutLabel}>{t('auth.logout')}</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  section: { backgroundColor: colors.background.primary, marginBottom: spacing.md, paddingVertical: spacing.sm },
  sectionTitle: { color: colors.text.secondary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, textTransform: 'uppercase' },
  languageToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  languageText: { color: colors.text.muted },
  languageActive: { color: colors.primary, fontWeight: '600' },
  logoutButton: { backgroundColor: colors.background.primary },
  logoutLabel: { fontSize: 16, fontWeight: '600' },
});
