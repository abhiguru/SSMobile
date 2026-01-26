import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Button, List, Divider, Switch, Avatar, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { changeLanguage } from '../../src/i18n';
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
        <Text variant="titleMedium" style={styles.name}>
          {user?.name || t('profile.guest')}
        </Text>
        <Text variant="bodyMedium" style={styles.phone}>{user?.phone || ''}</Text>
      </View>

      <View style={styles.section}>
        <List.Item
          title={t('profile.language')}
          right={() => (
            <View style={styles.languageToggle}>
              <Text variant="bodyMedium" style={[styles.languageText, !isGujarati && styles.languageActive]}>
                EN
              </Text>
              <Switch
                value={isGujarati}
                onValueChange={handleLanguageToggle}
                color={theme.colors.primary}
              />
              <Text variant="bodyMedium" style={[styles.languageText, isGujarati && styles.languageActive]}>
                gu
              </Text>
            </View>
          )}
        />
        <Divider />

        <List.Item
          title={t('profile.savedAddresses')}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => router.push('/(customer)/addresses')}
        />
        <Divider />

        <List.Item
          title={t('profile.notifications')}
          right={() => <List.Icon icon="chevron-right" />}
        />
        <Divider />

        <List.Item
          title={t('profile.aboutUs')}
          right={() => <List.Icon icon="chevron-right" />}
        />
        <Divider />

        <List.Item
          title={t('profile.help')}
          right={() => <List.Icon icon="chevron-right" />}
        />
      </View>

      <Button
        mode="text"
        textColor={theme.colors.error}
        onPress={handleLogout}
        style={styles.logoutButton}
        labelStyle={styles.logoutLabel}
      >
        {t('auth.logout')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontWeight: '600',
    color: '#333333',
    marginTop: 12,
    marginBottom: 4,
  },
  phone: {
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageText: {
    color: '#999999',
  },
  languageActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
