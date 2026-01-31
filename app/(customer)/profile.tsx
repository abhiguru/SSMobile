import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, List, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../src/store';
import { useLogoutMutation, useRequestAccountDeletionMutation } from '../../src/store/apiSlice';
import { changeLanguage } from '../../src/i18n';
import { colors, spacing, elevation, gradients, fontFamily } from '../../src/constants/theme';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { AppButton } from '../../src/components/common/AppButton';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { SegmentedControl } from '../../src/components/common/SegmentedControl';
import { FioriDialog } from '../../src/components/common/FioriDialog';
import { useToast } from '../../src/components/common/Toast';
export default function ProfileScreen() {
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

  const handleLanguageToggle = async (lang: string) => {
    await changeLanguage(lang);
  };

  const menuItems = [
    { icon: 'map-marker' as const, bg: colors.informativeLight, iconColor: colors.informative, title: t('profile.savedAddresses'), onPress: () => router.push('/(customer)/addresses') },
    { icon: 'bell-outline' as const, bg: colors.criticalLight, iconColor: colors.critical, title: t('profile.notifications'), onPress: () => {} },
    { icon: 'information' as const, bg: colors.positiveLight, iconColor: colors.positive, title: t('profile.aboutUs'), onPress: () => {} },
    { icon: 'help-circle' as const, bg: colors.brandLight + '33', iconColor: colors.brand, title: t('profile.help'), onPress: () => {} },
    { icon: 'delete-outline' as const, bg: colors.negativeLight, iconColor: colors.negative, title: t('profile.deleteAccount'), onPress: handleDeleteAccount },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.brand as unknown as [string, string]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarContainer}>
          <MaterialCommunityIcons name="account" size={48} color={colors.brand} />
        </View>
        <Text variant="titleMedium" style={styles.name}>{user?.name || t('profile.guest')}</Text>
        <Text variant="bodyMedium" style={styles.phone}>{user?.phone || ''}</Text>
      </LinearGradient>

      <View style={styles.section}>
        <SectionHeader title={t('profile.language')} />
        <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}>
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

      <View style={styles.section}>
        {menuItems.map((item, index) => (
          <View key={item.title}>
            <AnimatedPressable onPress={item.onPress}>
              <List.Item
                title={item.title}
                left={() => (
                  <View style={[styles.menuIconBg, { backgroundColor: item.bg }]}>
                    <MaterialCommunityIcons name={item.icon} size={20} color={item.iconColor} />
                  </View>
                )}
                right={() => <List.Icon icon="chevron-right" />}
              />
            </AnimatedPressable>
            {index < menuItems.length - 1 && <Divider />}
          </View>
        ))}
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
  header: { paddingTop: spacing.xxl, paddingBottom: spacing.xl, alignItems: 'center' },
  avatarContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.surface, marginBottom: spacing.sm, ...elevation.level3 },
  name: { fontFamily: fontFamily.semiBold, color: colors.text.inverse, marginBottom: spacing.xs },
  phone: { color: 'rgba(255,255,255,0.85)' },
  section: { backgroundColor: colors.surface, marginBottom: spacing.md, paddingVertical: spacing.sm },
  menuIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.sm },
  logoutContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
