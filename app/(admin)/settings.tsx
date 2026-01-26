import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Button, List, Divider, Switch, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { apiSlice } from '../../src/store/apiSlice';
import { changeLanguage } from '../../src/i18n';
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  section: { backgroundColor: '#FFFFFF', marginBottom: 16, paddingVertical: 8 },
  sectionTitle: { color: '#666666', paddingHorizontal: 16, paddingVertical: 8, textTransform: 'uppercase' },
  languageToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  languageText: { color: '#999999' },
  languageActive: { color: '#FF6B35', fontWeight: '600' },
  logoutButton: { backgroundColor: '#FFFFFF' },
  logoutLabel: { fontSize: 16, fontWeight: '600' },
});
