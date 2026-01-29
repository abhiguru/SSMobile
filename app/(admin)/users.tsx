import { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, RadioButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, fontFamily, elevation } from '../../src/constants/theme';
import {
  useGetUsersQuery,
  useUpdateUserRoleMutation,
} from '../../src/store/apiSlice';
import { User, UserRole } from '../../src/types';
import { AppButton } from '../../src/components/common/AppButton';
import type { AppTheme } from '../../src/theme';

const ROLE_BADGE_STYLES: Record<UserRole, { bg: string; text: string }> = {
  customer: { bg: colors.informativeLight, text: colors.informative },
  admin: { bg: '#FFF3E0', text: colors.brand },
  delivery_staff: { bg: colors.positiveLight, text: colors.positive },
  super_admin: { bg: '#F3E5F5', text: '#7B1FA2' },
};

const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'admin.roleCustomer',
  admin: 'admin.roleAdmin',
  delivery_staff: 'admin.roleDeliveryStaff',
  super_admin: 'admin.roleSuperAdmin',
};

const ALL_ROLES: UserRole[] = ['customer', 'admin', 'delivery_staff', 'super_admin'];

export default function UsersScreen() {
  const { t } = useTranslation();
  const theme = useTheme<AppTheme>();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: users = [], isLoading, isError, refetch } = useGetUsersQuery(
    debouncedSearch || undefined,
  );
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateUserRoleMutation();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(text.trim());
    }, 300);
  }, []);

  const openRolePicker = useCallback((user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role || 'customer');
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSelectedUser(null);
  }, []);

  const handleConfirmRole = useCallback(() => {
    if (!selectedUser) return;
    if (selectedRole === (selectedUser.role || 'customer')) {
      closeSheet();
      return;
    }

    const roleName = t(ROLE_LABELS[selectedRole]);
    Alert.alert(
      t('admin.roleChangeConfirmTitle'),
      t('admin.roleChangeConfirmMessage', {
        name: selectedUser.name || selectedUser.phone || '',
        role: roleName,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              await updateRole({
                user_id: selectedUser.id,
                role: selectedRole,
              }).unwrap();
              closeSheet();
            } catch {
              Alert.alert(t('common.error'), t('admin.roleChangeFailed'));
            }
          },
        },
      ],
    );
  }, [selectedUser, selectedRole, updateRole, closeSheet, t]);

  const renderUserCard = useCallback(({ item }: { item: User }) => {
    const role = item.role || 'customer';
    const badgeStyle = ROLE_BADGE_STYLES[role];

    return (
      <Pressable style={styles.card} onPress={() => openRolePicker(item)}>
        <View style={styles.cardRow}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account-circle" size={40} color={colors.neutral} />
          </View>
          <View style={styles.cardInfo}>
            <Text variant="bodyLarge" style={styles.userName}>
              {item.name || '—'}
            </Text>
            <Text variant="bodySmall" style={styles.userPhone}>
              {item.phone || ''}
            </Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.roleBadgeText, { color: badgeStyle.text }]}>
              {t(ROLE_LABELS[role])}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }, [openRolePicker, t]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.critical} />
        <Text variant="bodyMedium" style={styles.errorText}>{t('common.error')}</Text>
        <View style={{ marginTop: spacing.md }}>
          <AppButton variant="secondary" size="sm" onPress={refetch}>
            {t('common.retry')}
          </AppButton>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          placeholder={t('admin.searchUsers')}
          value={searchText}
          onChangeText={handleSearchChange}
          mode="outlined"
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={searchText ? <TextInput.Icon icon="close" onPress={() => { setSearchText(''); setDebouncedSearch(''); }} /> : undefined}
          outlineColor={colors.fieldBorder}
          activeOutlineColor={theme.colors.primary}
          dense
        />
      </View>

      {users.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="account-search" size={64} color={colors.neutral} />
          <Text variant="headlineSmall" style={styles.emptyTitle}>{t('admin.noUsers')}</Text>
        </View>
      ) : (
        <FlashList
          data={users}
          renderItem={renderUserCard}
          estimatedItemSize={72}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}

      {/* Role Picker Bottom Sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.backdrop} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text variant="titleMedium" style={styles.sheetTitle}>
              {t('admin.changeRole')}
            </Text>
            {selectedUser && (
              <Text variant="bodyMedium" style={styles.sheetSubtitle}>
                {selectedUser.name || selectedUser.phone || ''}
              </Text>
            )}

            <ScrollView keyboardShouldPersistTaps="handled">
              <RadioButton.Group
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as UserRole)}
              >
                {ALL_ROLES.map((role) => {
                  const badgeStyle = ROLE_BADGE_STYLES[role];
                  return (
                    <Pressable
                      key={role}
                      style={styles.roleOption}
                      onPress={() => setSelectedRole(role)}
                    >
                      <RadioButton value={role} color={theme.colors.primary} />
                      <View style={[styles.roleOptionBadge, { backgroundColor: badgeStyle.bg }]}>
                        <Text style={[styles.roleOptionText, { color: badgeStyle.text }]}>
                          {t(ROLE_LABELS[role])}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </RadioButton.Group>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <View style={styles.footerButton}>
                <AppButton variant="secondary" size="md" onPress={closeSheet} fullWidth>
                  {t('common.cancel')}
                </AppButton>
              </View>
              <View style={styles.footerButton}>
                <AppButton
                  variant="primary"
                  size="md"
                  onPress={handleConfirmRole}
                  loading={isUpdatingRole}
                  disabled={isUpdatingRole}
                  fullWidth
                >
                  {t('common.confirm')}
                </AppButton>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.shell,
    padding: spacing.lg,
  },
  errorText: {
    color: colors.critical,
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  searchContainer: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  searchInput: {
    backgroundColor: colors.surface,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...elevation.level1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
  },
  userPhone: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontFamily: fontFamily.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  sheetSubtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  roleOptionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  roleOptionText: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
  },
});
