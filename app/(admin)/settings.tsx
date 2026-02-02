import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../src/store';
import { useLogoutMutation, useRequestAccountDeletionMutation } from '../../src/store/apiSlice';
import { changeLanguage } from '../../src/i18n';
import { spacing, borderRadius, fontFamily, fontSize } from '../../src/constants/theme';
import { AppButton } from '../../src/components/common/AppButton';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { SegmentedControl } from '../../src/components/common/SegmentedControl';
import { FioriDialog } from '../../src/components/common/FioriDialog';
import { useToast } from '../../src/components/common/Toast';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useThemeMode } from '../../src/theme';
import type { ThemeMode } from '../../src/theme';

export default function AdminSettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [logout] = useLogoutMutation();
  const [requestAccountDeletion] = useRequestAccountDeletionMutation();
  const { showToast } = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const isGujarati = i18n.language === 'gu';
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const { appColors } = useAppTheme();
  const { mode, setMode } = useThemeMode();

  const handleLogout = () => {
    setLogoutDialogVisible(true);
  };

  const handleDeleteAccount = () => {
    setDeleteDialogVisible(true);
  };

  const confirmDeleteAccount = async () => {
    setDeleteDialogVisible(false);
    try {
      await requestAccountDeletion().unwrap();
      showToast({ message: t('profile.deleteAccountSuccess'), type: 'success' });
      router.replace('/(auth)/login');
      setTimeout(() => logout(), 100);
    } catch {
      showToast({ message: t('profile.deleteAccountFailed'), type: 'error' });
    }
  };

  const handleLanguageToggle = async (lang: string) => { await changeLanguage(lang); };

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <View style={[styles.section, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
        <SectionHeader title="Account" />
        <View style={styles.kvRow}>
          <Text style={[styles.kvLabel, { color: appColors.text.secondary }]}>Phone</Text>
          <Text style={[styles.kvValue, { color: appColors.text.primary }]}>{user?.phone || '-'}</Text>
        </View>
        <View style={[styles.kvDivider, { backgroundColor: appColors.border }]} />
        <View style={styles.kvRow}>
          <Text style={[styles.kvLabel, { color: appColors.text.secondary }]}>Role</Text>
          <Text style={[styles.kvValue, { color: appColors.text.primary }]}>Admin</Text>
        </View>
        <View style={[styles.kvDivider, { backgroundColor: appColors.border }]} />
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [styles.kvRow, pressed && { backgroundColor: appColors.pressedSurface }]}
        >
          <Text style={[styles.deleteLabel, { color: appColors.negative }]}>{t('profile.deleteAccount')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={appColors.negative} />
        </Pressable>
      </View>

      <View style={[styles.section, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
        <SectionHeader title="Preferences" />
        <View style={styles.languageRow}>
          <Text variant="bodyMedium" style={[styles.languageLabel, { color: appColors.text.primary }]}>{t('profile.language')}</Text>
          <SegmentedControl
            options={[
              { key: 'en', label: 'English' },
              { key: 'gu', label: 'ગુજરાતી' },
            ]}
            selectedKey={isGujarati ? 'gu' : 'en'}
            onSelect={handleLanguageToggle}
          />
        </View>
        <View style={[styles.kvDivider, { backgroundColor: appColors.border }]} />
        <View style={styles.languageRow}>
          <Text variant="bodyMedium" style={[styles.languageLabel, { color: appColors.text.primary }]}>{t('profile.theme')}</Text>
          <SegmentedControl
            options={[
              { key: 'system', label: t('profile.themeSystem') },
              { key: 'light', label: t('profile.themeLight') },
              { key: 'dark', label: t('profile.themeDark') },
            ]}
            selectedKey={mode}
            onSelect={(key) => setMode(key as ThemeMode)}
          />
        </View>
      </View>

      <View style={styles.logoutContainer}>
        <AppButton variant="danger" size="md" fullWidth onPress={handleLogout}>
          {t('auth.logout')}
        </AppButton>
      </View>

      <FioriDialog
        visible={logoutDialogVisible}
        onDismiss={() => setLogoutDialogVisible(false)}
        title={t('auth.logoutConfirmTitle')}
        actions={[
          { label: t('common.cancel'), onPress: () => setLogoutDialogVisible(false), variant: 'text' },
          { label: t('auth.logout'), onPress: () => { setLogoutDialogVisible(false); logout(); }, variant: 'danger' },
        ]}
      >
        <Text variant="bodyMedium">{t('auth.logoutConfirmMessage')}</Text>
      </FioriDialog>

      <FioriDialog
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        title={t('profile.deleteAccountConfirmTitle')}
        actions={[
          { label: t('common.cancel'), onPress: () => setDeleteDialogVisible(false), variant: 'text' },
          { label: t('profile.deleteAccountConfirmButton'), onPress: confirmDeleteAccount, variant: 'danger' },
        ]}
      >
        <Text variant="bodyMedium">{t('profile.deleteAccountConfirmMessage')}</Text>
      </FioriDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
  },
  kvLabel: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.regular,
  },
  kvValue: {
    fontSize: 17,
    fontFamily: fontFamily.regular,
  },
  kvDivider: {
    height: 1,
    marginLeft: spacing.lg,
  },
  deleteLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
  },
  languageRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  languageLabel: {
    marginBottom: spacing.sm,
  },
  logoutContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
});
