import { View, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, List, Divider, useTheme } from 'react-native-paper';

import { useAppSelector } from '../../src/store';
import { useLogoutMutation, useRequestAccountDeletionMutation } from '../../src/store/apiSlice';
import { changeLanguage } from '../../src/i18n';
import { colors, spacing, borderRadius, fontFamily } from '../../src/constants/theme';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { AppButton } from '../../src/components/common/AppButton';
import type { AppTheme } from '../../src/theme';

export default function AdminSettingsScreen() {
  const { t, i18n } = useTranslation();
  const [logout] = useLogoutMutation();
  const [requestAccountDeletion] = useRequestAccountDeletionMutation();
  const theme = useTheme<AppTheme>();
  const { user } = useAppSelector((state) => state.auth);
  const isGujarati = i18n.language === 'gu';

  const handleLogout = () => {
    Alert.alert(
      t('auth.logoutConfirmTitle'),
      t('auth.logoutConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccountConfirmTitle'),
      t('profile.deleteAccountConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccountConfirmButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await requestAccountDeletion().unwrap();
              Alert.alert('', t('profile.deleteAccountSuccess'), [
                { text: t('common.done'), onPress: () => logout() },
              ]);
            } catch {
              Alert.alert('', t('profile.deleteAccountFailed'));
            }
          },
        },
      ]
    );
  };

  const handleLanguageToggle = async (lang: string) => { await changeLanguage(lang); };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.sectionTitle}>Account</Text>
        <AnimatedPressable>
          <List.Item title="Phone" description={user?.phone || '-'} />
        </AnimatedPressable>
        <Divider />
        <AnimatedPressable>
          <List.Item title="Role" description="Admin" />
        </AnimatedPressable>
        <Divider />
        <AnimatedPressable onPress={handleDeleteAccount}>
          <List.Item
            title={t('profile.deleteAccount')}
            titleStyle={{ color: colors.negative }}
          />
        </AnimatedPressable>
      </View>
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.languageRow}>
          <Text variant="bodyMedium" style={styles.languageLabel}>{t('profile.language')}</Text>
          <View style={styles.languageSegmented}>
            <AnimatedPressable
              onPress={() => handleLanguageToggle('en')}
              style={[styles.langPill, !isGujarati && styles.langPillActive]}
            >
              <Text style={[styles.langText, !isGujarati && styles.langTextActive]}>English</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => handleLanguageToggle('gu')}
              style={[styles.langPill, isGujarati && styles.langPillActive]}
            >
              <Text style={[styles.langText, isGujarati && styles.langTextActive]}>ગુજરાતી</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
      <View style={styles.logoutContainer}>
        <AppButton variant="danger" size="md" fullWidth onPress={handleLogout}>
          {t('auth.logout')}
        </AppButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  section: { backgroundColor: colors.surface, marginBottom: spacing.md, paddingVertical: spacing.sm },
  sectionTitle: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.text.secondary, letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  languageRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  languageLabel: { color: colors.text.primary, marginBottom: spacing.sm },
  languageSegmented: { flexDirection: 'row', backgroundColor: colors.shell, borderRadius: borderRadius.md, padding: 4 },
  langPill: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center' },
  langPillActive: { backgroundColor: colors.brand },
  langText: { fontFamily: fontFamily.regular, color: colors.text.secondary },
  langTextActive: { color: colors.text.inverse },
  logoutContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
