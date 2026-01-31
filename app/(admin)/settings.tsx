import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../src/store';
import { useLogoutMutation, useRequestAccountDeletionMutation } from '../../src/store/apiSlice';
import { changeLanguage } from '../../src/i18n';
import { colors, spacing, borderRadius, fontFamily, fontSize } from '../../src/constants/theme';
import { AppButton } from '../../src/components/common/AppButton';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { SegmentedControl } from '../../src/components/common/SegmentedControl';
import { FioriDialog } from '../../src/components/common/FioriDialog';
import { useToast } from '../../src/components/common/Toast';

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
    <View style={styles.container}>
      <View style={styles.section}>
        <SectionHeader title="Account" />
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Phone</Text>
          <Text style={styles.kvValue}>{user?.phone || '-'}</Text>
        </View>
        <View style={styles.kvDivider} />
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Role</Text>
          <Text style={styles.kvValue}>Admin</Text>
        </View>
        <View style={styles.kvDivider} />
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [styles.kvRow, pressed && styles.kvRowPressed]}
        >
          <Text style={styles.deleteLabel}>{t('profile.deleteAccount')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.negative} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Preferences" />
        <View style={styles.languageRow}>
          <Text variant="bodyMedium" style={styles.languageLabel}>{t('profile.language')}</Text>
          <SegmentedControl
            options={[
              { key: 'en', label: 'English' },
              { key: 'gu', label: 'ગુજરાતી' },
            ]}
            selectedKey={isGujarati ? 'gu' : 'en'}
            onSelect={handleLanguageToggle}
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
  container: { flex: 1, backgroundColor: colors.shell },
  // Fiori grouped section: white bg, rounded corners, border
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  // Key-value row per spec 21: min 44pt height, 16pt horizontal padding, 11pt vertical
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
  },
  kvRowPressed: {
    backgroundColor: colors.pressedSurface,
  },
  kvLabel: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
  },
  kvValue: {
    fontSize: 17,
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
  },
  kvDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  deleteLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.negative,
  },
  languageRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  languageLabel: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  logoutContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
});
