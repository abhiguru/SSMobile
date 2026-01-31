import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, List, Divider, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../src/store';
import { useLogoutMutation, useRequestAccountDeletionMutation } from '../../src/store/apiSlice';
import { changeLanguage } from '../../src/i18n';
import { colors, spacing, elevation, gradients, borderRadius, fontFamily } from '../../src/constants/theme';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { AppButton } from '../../src/components/common/AppButton';
import type { AppTheme } from '../../src/theme';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
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
                {
                  text: t('common.done'),
                  onPress: () => {
                    router.replace('/(auth)/login');
                    setTimeout(() => logout(), 100);
                  },
                },
              ]);
            } catch {
              Alert.alert('', t('profile.deleteAccountFailed'));
            }
          },
        },
      ]
    );
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
        <Text variant="labelLarge" style={styles.sectionLabel}>{t('profile.language')}</Text>
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
  sectionLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  languageSegmented: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.shell, borderRadius: borderRadius.md, padding: 4 },
  langPill: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center' },
  langPillActive: { backgroundColor: colors.brand },
  langText: { fontWeight: '500', color: colors.text.secondary },
  langTextActive: { color: colors.text.inverse },
  menuIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.sm },
  logoutContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
