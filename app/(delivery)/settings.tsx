import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, List, Divider, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppSelector } from '../../src/store';
import { useLogoutMutation, useRequestAccountDeletionMutation, useUpdateProfileMutation } from '../../src/store/apiSlice';

const NOTIFICATION_PREF_KEY = '@notification_prefs';
import { changeLanguage } from '../../src/i18n';
import { spacing, elevation, fontFamily } from '../../src/constants/theme';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { AppButton } from '../../src/components/common/AppButton';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { SegmentedControl } from '../../src/components/common/SegmentedControl';
import { FioriDialog } from '../../src/components/common/FioriDialog';
import { FioriSwitch } from '../../src/components/common/FioriSwitch';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useThemeMode } from '../../src/theme';
import type { ThemeMode } from '../../src/theme';

export default function DeliverySettingsScreen() {
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
  const [orderNotifications, setOrderNotifications] = useState(true);
  const { appColors, appGradients } = useAppTheme();
  const { mode, setMode } = useThemeMode();

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATION_PREF_KEY).then((value) => {
      if (value) {
        try {
          const prefs = JSON.parse(value);
          setOrderNotifications(prefs.orderNotifications ?? true);
        } catch {}
      }
    });
  }, []);

  const handleOrderNotificationsChange = async (value: boolean) => {
    setOrderNotifications(value);
    await AsyncStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify({ orderNotifications: value, promoNotifications: false }));
  };

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

  const handleEditName = () => {
    setEditName(user?.name || '');
    setNameDialogVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    try {
      await updateProfile({ name: trimmed }).unwrap();
      setNameDialogVisible(false);
    } catch {
      // Error handling without toast
    }
  };

  const handleLanguageToggle = async (lang: string) => {
    await changeLanguage(lang);
    try {
      await updateProfile({ language: lang as 'en' | 'gu' }).unwrap();
    } catch {
      // Local preference already saved
    }
  };

  const menuItems = [
    { icon: 'information' as const, bg: appColors.positiveLight, iconColor: appColors.positive, title: t('profile.aboutUs'), onPress: () => {} },
    { icon: 'help-circle' as const, bg: appColors.brandLight + '33', iconColor: appColors.brand, title: t('profile.help'), onPress: () => {} },
    { icon: 'delete-outline' as const, bg: appColors.negativeLight, iconColor: appColors.negative, title: t('profile.deleteAccount'), onPress: handleDeleteAccount },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: appColors.shell }]} contentContainerStyle={styles.contentContainer}>
      <LinearGradient
        colors={appGradients.brand as unknown as [string, string]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.avatarContainer, { backgroundColor: appColors.surface, borderColor: appColors.surface }]}>
          <MaterialCommunityIcons name="account" size={48} color={appColors.brand} />
        </View>
        <AnimatedPressable onPress={handleEditName} style={styles.nameRow}>
          <Text variant="titleMedium" style={[styles.name, { color: appColors.text.inverse }]}>{user?.name || t('profile.guest')}</Text>
          <MaterialCommunityIcons name="pencil-outline" size={16} color="rgba(255,255,255,0.85)" style={styles.nameEditIcon} />
        </AnimatedPressable>
        <Text variant="bodyMedium" style={styles.phone}>{user?.phone || ''}</Text>
      </LinearGradient>

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
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

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <SectionHeader title={t('profile.theme')} />
        <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}>
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

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <SectionHeader title={t('profile.notifications')} />
        <View style={{ paddingHorizontal: spacing.lg }}>
          <FioriSwitch
            label={t('profile.orderNotifications')}
            description={t('profile.orderNotificationsDesc')}
            value={orderNotifications}
            onValueChange={handleOrderNotificationsChange}
          />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.xxl, paddingBottom: spacing.xl, alignItems: 'center' },
  avatarContainer: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 3, marginBottom: spacing.sm, ...elevation.level3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  name: { fontFamily: fontFamily.semiBold },
  nameEditIcon: { marginLeft: 6 },
  phone: { color: 'rgba(255,255,255,0.85)' },
  section: { marginBottom: spacing.md, paddingVertical: spacing.sm },
  menuIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.sm },
  logoutContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
