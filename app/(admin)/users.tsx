import { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, RadioButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontFamily, elevation } from '../../src/constants/theme';
import {
  useGetUsersQuery,
  useGetAdminUserAddressesQuery,
  useAddAdminAddressMutation,
  useUpdateAdminAddressMutation,
  useDeleteAdminAddressMutation,
  useUpdateUserRoleMutation,
  useGetDeletionRequestsQuery,
} from '../../src/store/apiSlice';
import { User, UserRole, AdminAddress } from '../../src/types';
import { AppButton } from '../../src/components/common/AppButton';
import { MapPinPicker } from '../../src/components/common/MapPinPicker';
import { PlacesAutocomplete, type PlaceDetails } from '../../src/components/common/PlacesAutocomplete';
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

const ADDR_STEP_SIZE = 32;
const ADDR_STEPS = [
  { labelKey: 'admin.step_contact', icon: 'account-outline' as const },
  { labelKey: 'admin.step_address', icon: 'map-marker-outline' as const },
  { labelKey: 'admin.step_location', icon: 'crosshairs-gps' as const },
];

// Small component that lazily fetches addresses for a single user card
function UserCardAddresses({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { data: addresses } = useGetAdminUserAddressesQuery(userId);

  if (!addresses || addresses.length === 0) return null;

  return (
    <View style={styles.addressSection}>
      {addresses.map((addr) => {
        const parts = [addr.address_line1, addr.city, addr.pincode].filter(Boolean);
        const summary = addr.label ? `${addr.label}: ${parts.join(', ')}` : parts.join(', ');
        const isDefault = addr.is_default;

        return (
          <View key={addr.id} style={styles.addressRow}>
            <MaterialCommunityIcons
              name={isDefault ? 'map-marker-check' : 'map-marker-outline'}
              size={16}
              color={isDefault ? colors.positive : colors.text.secondary}
              style={styles.addressIcon}
            />
            <Text
              variant="bodySmall"
              style={[styles.addressText, isDefault && styles.addressTextDefault]}
              numberOfLines={1}
            >
              {summary}
            </Text>
            {isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>{t('admin.defaultAddress')}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function UsersScreen() {
  const { t } = useTranslation();
  const theme = useTheme<AppTheme>();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: users = [], isLoading, isError, refetch } = useGetUsersQuery(
    debouncedSearch || undefined,
  );
  const { data: deletionRequests = [] } = useGetDeletionRequestsQuery();
  const pendingDeletionUserIds = new Set(deletionRequests.map((r) => r.user_id));
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateUserRoleMutation();
  const [addAdminAddress, { isLoading: isAddingAddress }] = useAddAdminAddressMutation();
  const [updateAdminAddress, { isLoading: isUpdatingAddress }] = useUpdateAdminAddressMutation();
  const [deleteAdminAddress] = useDeleteAdminAddressMutation();

  // Sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('customer');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Per-user address fetch (only when sheet is open)
  const { data: selectedUserAddresses = [] } = useGetAdminUserAddressesQuery(
    selectedUser?.id ?? '',
    { skip: !selectedUser },
  );

  // Address form sheet state
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AdminAddress | null>(null);
  const [addrLabel, setAddrLabel] = useState('');
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addrLat, setAddrLat] = useState<number | null>(null);
  const [addrLng, setAddrLng] = useState<number | null>(null);
  const [addrFormattedAddress, setAddrFormattedAddress] = useState<string | null>(null);
  const [addrStep, setAddrStep] = useState(0);
  const [addrError, setAddrError] = useState('');

  const isSavingAddress = isAddingAddress || isUpdatingAddress;
  const insets = useSafeAreaInsets();

  // Address step animations
  const addrS0 = useSharedValue(1);
  const addrS1 = useSharedValue(1);
  const addrS2 = useSharedValue(1);
  const addrStepScales = [addrS0, addrS1, addrS2];
  const addrSA0 = useAnimatedStyle(() => ({ transform: [{ scale: addrS0.value }] }));
  const addrSA1 = useAnimatedStyle(() => ({ transform: [{ scale: addrS1.value }] }));
  const addrSA2 = useAnimatedStyle(() => ({ transform: [{ scale: addrS2.value }] }));
  const addrStepAnimStyles = [addrSA0, addrSA1, addrSA2];

  const animateAddrStep = useCallback((step: number) => {
    addrStepScales[step].value = withSpring(1.2, { damping: 8, stiffness: 400 });
    setTimeout(() => {
      addrStepScales[step].value = withSpring(1, { damping: 10, stiffness: 300 });
    }, 200);
  }, [addrStepScales]);

  // Address step validation
  const addrStep0Valid = addrFullName.trim().length > 0 && addrPhone.trim().length > 0;
  const addrStep1Valid = addrLine1.trim().length > 0 && addrCity.trim().length > 0 && addrPincode.trim().length > 0;

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(text.trim());
    }, 300);
  }, []);

  const openEditSheet = useCallback((user: User) => {
    setSelectedUser(user);
    setFormName(user.name || '');
    setFormRole(user.role || 'customer');
    setFormActive(user.is_active !== false);
    setFormError('');
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSelectedUser(null);
    setFormError('');
  }, []);

  // Address form helpers
  const resetAddressForm = useCallback(() => {
    setAddrLabel('');
    setAddrFullName('');
    setAddrPhone('');
    setAddrLine1('');
    setAddrLine2('');
    setAddrCity('');
    setAddrState('');
    setAddrPincode('');
    setAddrIsDefault(false);
    setAddrLat(null);
    setAddrLng(null);
    setAddrFormattedAddress(null);
    setAddrStep(0);
    setAddrError('');
    setEditingAddress(null);
  }, []);

  const handlePlaceSelected = useCallback((details: PlaceDetails) => {
    setAddrLine1(details.addressLine1);
    setAddrLine2(details.addressLine2);
    setAddrCity(details.city);
    setAddrState(details.state);
    setAddrPincode(details.pincode);
    setAddrLat(details.lat);
    setAddrLng(details.lng);
    setAddrFormattedAddress(details.formattedAddress);
  }, []);

  const openAddressForm = useCallback((addr?: AdminAddress) => {
    if (addr) {
      setEditingAddress(addr);
      setAddrLabel(addr.label || '');
      setAddrFullName(addr.full_name || '');
      setAddrPhone(addr.phone || '');
      setAddrLine1(addr.address_line1 || '');
      setAddrLine2(addr.address_line2 || '');
      setAddrCity(addr.city || '');
      setAddrState(addr.state || '');
      setAddrPincode(addr.pincode || '');
      setAddrIsDefault(addr.is_default || false);
      setAddrLat(addr.lat ?? null);
      setAddrLng(addr.lng ?? null);
      setAddrFormattedAddress(addr.formatted_address ?? null);
    } else {
      resetAddressForm();
    }
    setAddrError('');
    setAddressSheetVisible(true);
  }, [resetAddressForm]);

  const closeAddressForm = useCallback(() => {
    setAddressSheetVisible(false);
    resetAddressForm();
  }, [resetAddressForm]);

  const handleSaveAddress = useCallback(async () => {
    if (!selectedUser) return;

    // Validate required fields
    if (!addrFullName.trim() || !addrPhone.trim() || !addrLine1.trim() || !addrCity.trim() || !addrPincode.trim()) {
      setAddrError(t('admin.addressRequired'));
      return;
    }

    try {
      if (editingAddress) {
        await updateAdminAddress({
          address_id: editingAddress.id,
          _userId: selectedUser.id,
          full_name: addrFullName.trim(),
          phone: addrPhone.trim(),
          address_line1: addrLine1.trim(),
          address_line2: addrLine2.trim() || null,
          city: addrCity.trim(),
          state: addrState.trim() || null,
          pincode: addrPincode.trim(),
          label: addrLabel.trim() || null,
          is_default: addrIsDefault,
          ...(addrLat != null && addrLng != null ? { lat: addrLat, lng: addrLng } : {}),
          formatted_address: addrFormattedAddress || null,
        }).unwrap();
      } else {
        const saved = await addAdminAddress({
          user_id: selectedUser.id,
          full_name: addrFullName.trim(),
          phone: addrPhone.trim(),
          address_line1: addrLine1.trim(),
          address_line2: addrLine2.trim() || undefined,
          city: addrCity.trim(),
          state: addrState.trim() || undefined,
          pincode: addrPincode.trim(),
          label: addrLabel.trim() || undefined,
          is_default: addrIsDefault,
          ...(addrLat != null && addrLng != null ? { lat: addrLat, lng: addrLng } : {}),
          ...(addrFormattedAddress ? { formatted_address: addrFormattedAddress } : {}),
        }).unwrap();
      }
      closeAddressForm();
    } catch {
      setAddrError(t('admin.addressSaveFailed'));
    }
  }, [selectedUser, editingAddress, addrFullName, addrPhone, addrLine1, addrLine2, addrCity, addrState, addrPincode, addrLabel, addrIsDefault, addrLat, addrLng, addrFormattedAddress, addAdminAddress, updateAdminAddress, closeAddressForm, t]);

  const handleDeleteAddress = useCallback((addr: AdminAddress) => {
    if (!selectedUser) return;
    Alert.alert(
      t('admin.deleteAddress'),
      t('admin.deleteAddressConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAdminAddress({ address_id: addr.id, _userId: selectedUser.id }).unwrap();
            } catch {
              Alert.alert(t('common.error'), t('admin.addressDeleteFailed'));
            }
          },
        },
      ],
    );
  }, [selectedUser, deleteAdminAddress, t]);

  const handleSave = useCallback(() => {
    if (!selectedUser) return;

    const origRole = selectedUser.role || 'customer';
    const origName = selectedUser.name || '';
    const origActive = selectedUser.is_active !== false;

    const nameChanged = formName.trim() !== origName;
    const roleChanged = formRole !== origRole;
    const activeChanged = formActive !== origActive;

    if (!nameChanged && !roleChanged && !activeChanged) {
      closeSheet();
      return;
    }

    const payload: { user_id: string; name?: string; role?: UserRole; is_active?: boolean } = {
      user_id: selectedUser.id,
    };
    if (nameChanged) payload.name = formName.trim();
    if (roleChanged) payload.role = formRole;
    if (activeChanged) payload.is_active = formActive;

    const doSave = async () => {
      try {
        await updateRole(payload).unwrap();
        closeSheet();
      } catch {
        setFormError(t('admin.userSaveFailed'));
      }
    };

    if (roleChanged) {
      const roleName = t(ROLE_LABELS[formRole]);
      Alert.alert(
        t('admin.roleChangeConfirmTitle'),
        t('admin.roleChangeConfirmMessage', {
          name: selectedUser.name || selectedUser.phone || '',
          role: roleName,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), onPress: doSave },
        ],
      );
    } else {
      doSave();
    }
  }, [selectedUser, formName, formRole, formActive, updateRole, closeSheet, t]);

  const handleToggleActive = useCallback((user: User) => {
    const isActive = user.is_active !== false;
    const name = user.name || user.phone || '';

    if (isActive) {
      Alert.alert(
        t('admin.blockConfirmTitle'),
        t('admin.blockConfirmMessage', { name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async () => {
              try {
                await updateRole({ user_id: user.id, is_active: false }).unwrap();
              } catch {
                Alert.alert(t('common.error'), t('admin.blockFailed'));
              }
            },
          },
        ],
      );
    } else {
      Alert.alert(
        t('admin.unblockConfirmTitle'),
        t('admin.unblockConfirmMessage', { name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: async () => {
              try {
                await updateRole({ user_id: user.id, is_active: true }).unwrap();
              } catch {
                Alert.alert(t('common.error'), t('admin.blockFailed'));
              }
            },
          },
        ],
      );
    }
  }, [updateRole, t]);

  const renderUserCard = useCallback(({ item }: { item: User }) => {
    const role = item.role || 'customer';
    const isActive = item.is_active !== false;
    const badgeStyle = ROLE_BADGE_STYLES[role];
    const hasPendingDeletion = pendingDeletionUserIds.has(item.id);

    return (
      <Pressable style={[styles.card, !isActive && styles.cardBlocked]} onPress={() => openEditSheet(item)}>
        <View style={styles.cardRow}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account-circle" size={40} color={isActive ? colors.neutral : colors.critical} />
          </View>
          <View style={styles.cardInfo}>
            <Text variant="bodyLarge" style={styles.userName}>
              {item.name || '—'}
            </Text>
            <Text variant="bodySmall" style={styles.userPhone}>
              {item.phone || ''}
            </Text>
          </View>
          {!isActive ? (
            <View style={[styles.roleBadge, { backgroundColor: '#FFEBEE' }]}>
              <Text style={[styles.roleBadgeText, { color: colors.critical }]}>
                {t('admin.blocked')}
              </Text>
            </View>
          ) : (
            <View style={[styles.roleBadge, { backgroundColor: badgeStyle.bg }]}>
              <Text style={[styles.roleBadgeText, { color: badgeStyle.text }]}>
                {t(ROLE_LABELS[role])}
              </Text>
            </View>
          )}
          <Switch
            value={isActive}
            onValueChange={() => handleToggleActive(item)}
            trackColor={{ false: colors.critical, true: colors.positive }}
            style={styles.activeSwitch}
          />
        </View>
        {hasPendingDeletion && (
          <View style={styles.deletionBadgeRow}>
            <MaterialCommunityIcons name="alert-circle" size={16} color={colors.negative} />
            <Text style={styles.deletionBadgeText}>{t('admin.deletionRequested')}</Text>
          </View>
        )}
        <UserCardAddresses userId={item.id} />
      </Pressable>
    );
  }, [openEditSheet, handleToggleActive, pendingDeletionUserIds, t]);

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
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}

      {/* Edit User Full-Screen Sheet */}
      <Modal
        visible={sheetVisible}
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={styles.sheetFull}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheetHeader}>
            <Pressable onPress={closeSheet} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
            </Pressable>
            <Text variant="titleMedium" style={styles.sheetHeaderTitle}>
              {t('admin.editUser')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          {selectedUser && (
            <Text variant="bodyMedium" style={styles.sheetSubtitle}>
              {selectedUser.phone || ''}
            </Text>
          )}

            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Name field */}
              <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.userName')}</Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder={t('admin.userNamePlaceholder')}
                mode="outlined"
                style={styles.fieldInput}
                outlineColor={colors.fieldBorder}
                activeOutlineColor={theme.colors.primary}
                dense
              />

              {/* Phone field (read-only) */}
              <Text variant="bodySmall" style={styles.fieldLabel}>{t('profile.phone')}</Text>
              <TextInput
                value={selectedUser?.phone || ''}
                mode="outlined"
                style={styles.fieldInput}
                outlineColor={colors.fieldBorder}
                disabled
                dense
              />

              {/* Role picker */}
              <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.userRole')}</Text>
              <RadioButton.Group
                value={formRole}
                onValueChange={(v) => setFormRole(v as UserRole)}
              >
                {ALL_ROLES.map((role) => {
                  const badgeStyle = ROLE_BADGE_STYLES[role];
                  return (
                    <Pressable
                      key={role}
                      style={styles.roleOption}
                      onPress={() => setFormRole(role)}
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

              {/* Active toggle */}
              <View style={styles.activeRow}>
                <Text variant="bodyMedium" style={styles.activeLabel}>{t('admin.userActive')}</Text>
                <Switch
                  value={formActive}
                  onValueChange={setFormActive}
                  trackColor={{ false: colors.critical, true: colors.positive }}
                />
              </View>

              {/* Addresses with CRUD */}
              <View style={styles.addressHeaderRow}>
                <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.userAddresses')}</Text>
                <Pressable style={styles.addAddressBtn} onPress={() => openAddressForm()}>
                  <MaterialCommunityIcons name="plus" size={16} color={colors.brand} />
                  <Text style={styles.addAddressBtnText}>{t('admin.addAddress')}</Text>
                </Pressable>
              </View>
              {selectedUserAddresses.length === 0 ? (
                <Text variant="bodySmall" style={styles.noAddresses}>{t('admin.noAddresses')}</Text>
              ) : (
                <View style={styles.sheetAddressList}>
                  {selectedUserAddresses.map((addr) => {
                    const parts = [addr.address_line1, addr.city, addr.pincode].filter(Boolean);
                    const summary = addr.label ? `${addr.label}: ${parts.join(', ')}` : parts.join(', ');
                    return (
                      <View key={addr.id} style={[styles.sheetAddressCard, addr.is_default && styles.sheetAddressCardDefault]}>
                        <View style={styles.sheetAddressRow}>
                          <MaterialCommunityIcons
                            name={addr.is_default ? 'map-marker-check' : 'map-marker-outline'}
                            size={18}
                            color={addr.is_default ? colors.positive : colors.text.secondary}
                          />
                          <Text
                            variant="bodySmall"
                            style={[styles.sheetAddressText, addr.is_default && styles.addressTextDefault]}
                            numberOfLines={2}
                          >
                            {summary}
                          </Text>
                          {addr.is_default && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>{t('admin.defaultAddress')}</Text>
                            </View>
                          )}
                          <Pressable
                            style={styles.addrActionBtn}
                            onPress={() => openAddressForm(addr)}
                            hitSlop={8}
                          >
                            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.text.secondary} />
                          </Pressable>
                          <Pressable
                            style={styles.addrActionBtn}
                            onPress={() => handleDeleteAddress(addr)}
                            hitSlop={8}
                          >
                            <MaterialCommunityIcons name="delete-outline" size={18} color={colors.critical} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Error text */}
              {formError ? (
                <Text variant="bodySmall" style={styles.formError}>{formError}</Text>
              ) : null}
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
                onPress={handleSave}
                loading={isUpdatingRole}
                disabled={isUpdatingRole}
                fullWidth
              >
                {t('common.save')}
              </AppButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Address Form — Full-Screen Multi-Step */}
      <Modal
        visible={addressSheetVisible}
        animationType="slide"
        onRequestClose={closeAddressForm}
      >
        <View style={styles.sheetFull}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Pressable onPress={closeAddressForm} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
            </Pressable>
            <Text variant="titleMedium" style={styles.sheetHeaderTitle}>
              {editingAddress ? t('admin.editAddress') : t('admin.addAddress')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Step Indicator */}
          <View style={styles.addrStepContainer}>
            {ADDR_STEPS.map((step, index) => {
              const isActive = index <= addrStep;
              const isCurrent = index === addrStep;
              const isCompleted = index < addrStep;
              const circleColor = isCurrent
                ? colors.brand
                : isCompleted
                  ? colors.positive
                  : colors.neutralLight;
              const iconColor = isActive ? colors.text.inverse : colors.neutral;
              return (
                <View key={index} style={styles.addrStepWrapper}>
                  {index > 0 && (
                    <View
                      style={[
                        styles.addrStepLine,
                        { backgroundColor: isActive ? colors.positive : colors.neutralLight },
                      ]}
                    />
                  )}
                  <Animated.View
                    style={[
                      styles.addrStepCircle,
                      { backgroundColor: circleColor },
                      addrStepAnimStyles[index],
                    ]}
                  >
                    {isCompleted ? (
                      <MaterialCommunityIcons name="check" size={16} color={iconColor} />
                    ) : (
                      <MaterialCommunityIcons name={step.icon} size={16} color={iconColor} />
                    )}
                  </Animated.View>
                  <Text
                    variant="labelSmall"
                    style={[styles.addrStepLabel, isActive && styles.addrStepLabelActive]}
                  >
                    {t(step.labelKey)}
                  </Text>
                </View>
              );
            })}
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
            >
              {/* Step 0: Contact */}
              {addrStep === 0 && (
                <View style={styles.addrStepCard}>
                  <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.addressLabel')}</Text>
                  <TextInput
                    value={addrLabel}
                    onChangeText={setAddrLabel}
                    placeholder={t('admin.addressLabelPlaceholder')}
                    mode="outlined"
                    style={styles.fieldInput}
                    outlineColor={colors.fieldBorder}
                    activeOutlineColor={theme.colors.primary}
                    dense
                  />

                  <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.addressFullName')} *</Text>
                  <TextInput
                    value={addrFullName}
                    onChangeText={setAddrFullName}
                    placeholder={t('admin.addressFullNamePlaceholder')}
                    mode="outlined"
                    style={styles.fieldInput}
                    outlineColor={colors.fieldBorder}
                    activeOutlineColor={theme.colors.primary}
                    dense
                  />

                  <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.addressPhone')} *</Text>
                  <TextInput
                    value={addrPhone}
                    onChangeText={setAddrPhone}
                    placeholder={t('admin.addressPhonePlaceholder')}
                    mode="outlined"
                    style={styles.fieldInput}
                    outlineColor={colors.fieldBorder}
                    activeOutlineColor={theme.colors.primary}
                    keyboardType="phone-pad"
                    dense
                  />
                </View>
              )}

              {/* Step 1: Address */}
              {addrStep === 1 && (
                <View style={styles.addrStepCard}>
                  <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.addressLine1')} *</Text>
                  <PlacesAutocomplete
                    value={addrLine1}
                    onChangeText={setAddrLine1}
                    onPlaceSelected={handlePlaceSelected}
                    placeholder={t('admin.addressLine1Placeholder')}
                  />

                  <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.addressLine2')}</Text>
                  <TextInput
                    value={addrLine2}
                    onChangeText={setAddrLine2}
                    placeholder={t('admin.addressLine2Placeholder')}
                    mode="outlined"
                    style={styles.fieldInput}
                    outlineColor={colors.fieldBorder}
                    activeOutlineColor={theme.colors.primary}
                    dense
                  />

                  <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.addressCity')} *</Text>
                  <TextInput
                    value={addrCity}
                    onChangeText={setAddrCity}
                    placeholder={t('admin.addressCityPlaceholder')}
                    mode="outlined"
                    style={styles.fieldInput}
                    outlineColor={colors.fieldBorder}
                    activeOutlineColor={theme.colors.primary}
                    dense
                  />

                  <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.addressState')}</Text>
                  <TextInput
                    value={addrState}
                    onChangeText={setAddrState}
                    placeholder={t('admin.addressStatePlaceholder')}
                    mode="outlined"
                    style={styles.fieldInput}
                    outlineColor={colors.fieldBorder}
                    activeOutlineColor={theme.colors.primary}
                    dense
                  />

                  <Text variant="bodySmall" style={styles.fieldLabel}>{t('admin.addressPincode')} *</Text>
                  <TextInput
                    value={addrPincode}
                    onChangeText={setAddrPincode}
                    placeholder={t('admin.addressPincodePlaceholder')}
                    mode="outlined"
                    style={styles.fieldInput}
                    outlineColor={colors.fieldBorder}
                    activeOutlineColor={theme.colors.primary}
                    keyboardType="numeric"
                    maxLength={6}
                    dense
                  />

                  <View style={styles.activeRow}>
                    <Text variant="bodyMedium" style={styles.activeLabel}>{t('admin.addressIsDefault')}</Text>
                    <Switch
                      value={addrIsDefault}
                      onValueChange={setAddrIsDefault}
                      trackColor={{ false: colors.neutral, true: colors.positive }}
                    />
                  </View>
                </View>
              )}

              {/* Step 2: Map Location */}
              {addrStep === 2 && (
                <View style={styles.addrStepCard}>
                  {/* Address summary (read-only) */}
                  <View style={styles.addrSummaryBox}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.text.secondary} />
                    <Text variant="bodySmall" style={styles.addrSummaryText}>
                      {[addrLine1, addrLine2, addrCity, addrState, addrPincode].filter(Boolean).join(', ')}
                    </Text>
                  </View>

                  <MapPinPicker
                    latitude={addrLat}
                    longitude={addrLng}
                    onLocationChange={(lat, lng, formatted) => {
                      setAddrLat(lat);
                      setAddrLng(lng);
                      if (formatted) setAddrFormattedAddress(formatted);
                    }}
                    addressText={[addrLine1, addrLine2, addrCity, addrState, addrPincode].filter(Boolean).join(', ')}
                  />
                </View>
              )}

              {addrError ? (
                <Text variant="bodySmall" style={styles.formError}>{addrError}</Text>
              ) : null}
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={[styles.sheetFooter, { paddingBottom: insets.bottom + spacing.md }]}>
              <View style={styles.footerButton}>
                <AppButton
                  variant="outline"
                  size="lg"
                  fullWidth
                  onPress={() => {
                    if (addrStep === 0) {
                      closeAddressForm();
                    } else {
                      const prev = addrStep - 1;
                      setAddrStep(prev);
                      animateAddrStep(prev);
                    }
                  }}
                >
                  {addrStep === 0 ? t('common.cancel') : t('common.back')}
                </AppButton>
              </View>
              <View style={styles.footerButton}>
                {addrStep < 2 ? (
                  <AppButton
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={addrStep === 0 ? !addrStep0Valid : !addrStep1Valid}
                    onPress={() => {
                      const next = addrStep + 1;
                      setAddrStep(next);
                      animateAddrStep(next);
                    }}
                  >
                    {t('common.next')}
                  </AppButton>
                ) : (
                  <AppButton
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isSavingAddress}
                    disabled={isSavingAddress}
                    onPress={handleSaveAddress}
                  >
                    {t('admin.saveChanges')}
                  </AppButton>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
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
  cardBlocked: {
    opacity: 0.6,
  },
  activeSwitch: {
    marginLeft: spacing.sm,
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
  deletionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deletionBadgeText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.negative,
    marginLeft: 6,
  },
  // Address section on cards
  addressSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressIcon: {
    marginRight: 6,
  },
  addressText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: 12,
  },
  addressTextDefault: {
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
  },
  defaultBadge: {
    backgroundColor: colors.positiveLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginLeft: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
    color: colors.positive,
  },
  // Full-screen sheet
  sheetFull: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetHeaderTitle: {
    fontFamily: fontFamily.bold,
    color: colors.text.primary,
  },
  sheetSubtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sheetScroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  fieldInput: {
    backgroundColor: colors.surface,
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
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeLabel: {
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
  },
  noAddresses: {
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  addAddressBtnText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.brand,
    marginLeft: 4,
  },
  addrActionBtn: {
    padding: 4,
    marginLeft: 6,
  },
  sheetAddressList: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  sheetAddressCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  sheetAddressCardDefault: {
    borderColor: colors.positive,
    backgroundColor: colors.positiveLight,
  },
  sheetAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetAddressText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: 13,
    marginLeft: 6,
  },
  formError: {
    color: colors.critical,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    textAlign: 'center',
  },
  // Address multi-step indicator
  addrStepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addrStepWrapper: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  addrStepCircle: {
    width: ADDR_STEP_SIZE,
    height: ADDR_STEP_SIZE,
    borderRadius: ADDR_STEP_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addrStepLine: {
    position: 'absolute',
    top: ADDR_STEP_SIZE / 2,
    right: '50%',
    width: '100%',
    height: 3,
    zIndex: -1,
  },
  addrStepLabel: {
    marginTop: spacing.xs,
    color: colors.neutral,
    textAlign: 'center',
  },
  addrStepLabelActive: {
    color: colors.brand,
    fontFamily: fontFamily.semiBold,
  },
  addrStepCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...elevation.level1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  addrSummaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.shell,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  addrSummaryText: {
    flex: 1,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    fontSize: 13,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
  },
});
