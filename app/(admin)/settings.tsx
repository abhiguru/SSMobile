import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../src/store';
import { useLogoutMutation, useRequestAccountDeletionMutation, useUpdateProfileMutation } from '../../src/store/apiSlice';
import { changeLanguage } from '../../src/i18n';
import { spacing, borderRadius, fontFamily, fontSize } from '../../src/constants/theme';
import { AppButton } from '../../src/components/common/AppButton';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { SegmentedControl } from '../../src/components/common/SegmentedControl';
import { FioriDialog } from '../../src/components/common/FioriDialog';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useThemeMode } from '../../src/theme';
import type { ThemeMode } from '../../src/theme';

export default function AdminSettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [logout] = useLogoutMutation();
  const [requestAccountDeletion] = useRequestAccountDeletionMutation();
  const [updateProfile] = useUpdateProfileMutation();
  const { user } = useAppSelector((state) => state.auth);
  const isGujarati = i18n.language === 'gu';
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [nameDialogVisible, setNameDialogVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
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
      router.replace('/(auth)/login');
      setTimeout(() => logout(), 100);
    } catch {
      // Error handling without toast
    }
  };

  const handleLanguageToggle = async (lang: string) => { await changeLanguage(lang); };

  const handleEditName = () => {
    setEditName(user?.name || '');
    setNameDialogVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      return;
    }
    try {
      await updateProfile({ name: trimmed }).unwrap();
      setNameDialogVisible(false);
    } catch {
      // Error handling without toast
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <View style={[styles.section, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
        <SectionHeader title="Account" />
        <Pressable
          onPress={handleEditName}
          style={({ pressed }) => [styles.kvRow, pressed && { backgroundColor: appColors.pressedSurface }]}
        >
          <Text style={[styles.kvLabel, { color: appColors.text.secondary }]}>{t('profile.name')}</Text>
          <View style={styles.kvValueRow}>
            <Text style={[styles.kvValue, { color: appColors.text.primary }]}>{user?.name || t('profile.guest')}</Text>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={appColors.text.secondary} style={styles.editIcon} />
          </View>
        </Pressable>
        <View style={[styles.kvDivider, { backgroundColor: appColors.border }]} />
        <View style={styles.kvRow}>
          <Text style={[styles.kvLabel, { color: appColors.text.secondary }]}>{t('profile.phone')}</Text>
          <Text style={[styles.kvValue, { color: appColors.text.primary }]}>{user?.phone || '-'}</Text>
        </View>
        <View style={[styles.kvDivider, { backgroundColor: appColors.border }]} />
        <View style={styles.kvRow}>
          <Text style={[styles.kvLabel, { color: appColors.text.secondary }]}>{t('admin.userRole')}</Text>
          <Text style={[styles.kvValue, { color: appColors.text.primary }]}>{t('admin.roleAdmin')}</Text>
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

      <FioriDialog
        visible={nameDialogVisible}
        onDismiss={() => setNameDialogVisible(false)}
        title={t('profile.editName')}
        actions={[
          { label: t('common.cancel'), onPress: () => setNameDialogVisible(false), variant: 'text' },
          { label: t('common.save'), onPress: handleSaveName, variant: 'primary' },
        ]}
      >
        <TextInput
          mode="outlined"
          label={t('profile.name')}
          placeholder={t('profile.enterYourName')}
          value={editName}
          onChangeText={setEditName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSaveName}
          style={{ backgroundColor: appColors.surface }}
        />
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
  kvValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editIcon: {
    marginLeft: spacing.xs,
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
