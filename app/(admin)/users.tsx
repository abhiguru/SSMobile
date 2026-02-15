import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonBox, SkeletonText } from '../../src/components/common/SkeletonLoader';
import { spacing, borderRadius, fontFamily, fontSize, elevation } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme/useAppTheme';
import {
  useGetUsersQuery,
  useGetAdminUserAddressesQuery,
  useAddAdminAddressMutation,
  useUpdateAdminAddressMutation,
  useDeleteAdminAddressMutation,
  useUpdateUserRoleMutation,
  useGetDeletionRequestsQuery,
  useProcessAccountDeletionMutation,
} from '../../src/store/apiSlice';
import { User, UserRole, AdminAddress, GetUsersParams } from '../../src/types';
import { AppButton } from '../../src/components/common/AppButton';
import { FioriSearchBar } from '../../src/components/common/FioriSearchBar';
import { FioriDialog } from '../../src/components/common/FioriDialog';
import { FioriChip } from '../../src/components/common/FioriChip';
import { MapPinPicker } from '../../src/components/common/MapPinPicker';
import { PlacesAutocomplete, type PlaceDetails } from '../../src/components/common/PlacesAutocomplete';

const PAGE_SIZE = 20;

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';

function UsersSkeleton({ appColors }: { appColors: { shell: string } }) {
  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <View style={styles.skeletonSearchBar}>
        <SkeletonBox width="100%" height={44} borderRadius={borderRadius.lg} />
      </View>
      <View style={{ padding: spacing.md }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.skeletonCard}>
            <View style={styles.skeletonCardRow}>
              <SkeletonBox width={40} height={40} borderRadius={20} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <SkeletonText lines={1} width="45%" />
                <SkeletonText lines={1} width="30%" style={{ marginTop: spacing.xs }} />
              </View>
              <SkeletonBox width={70} height={24} borderRadius={borderRadius.sm} />
              <SkeletonBox width={40} height={24} borderRadius={borderRadius.md} style={{ marginLeft: spacing.sm }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'admin.roleCustomer',
  admin: 'admin.roleAdmin',
  delivery_staff: 'admin.roleDeliveryStaff',
};

// Role filter options (null means "all")
type RoleFilter = UserRole | null;
const ROLE_FILTERS: { value: RoleFilter; labelKey: string }[] = [
  { value: null, labelKey: 'admin.allRoles' },
  { value: 'customer', labelKey: 'admin.roleCustomer' },
  { value: 'admin', labelKey: 'admin.roleAdmin' },
  { value: 'delivery_staff', labelKey: 'admin.roleDeliveryStaff' },
];

// Error code mappings
const ERROR_CODE_MESSAGES: Record<string, string> = {
  CANNOT_CHANGE_OWN_ROLE: 'admin.errors.cannotChangeOwnRole',
  STAFF_HAS_ACTIVE_DELIVERY: 'admin.errors.staffHasActiveDelivery',
  USER_NOT_FOUND: 'admin.errors.userNotFound',
  INVALID_ROLE: 'admin.errors.invalidRole',
};

const ADDR_STEP_SIZE = 32;
const ADDR_STEPS = [
  { labelKey: 'admin.step_contact', icon: 'account-outline' as const },
  { labelKey: 'admin.step_address', icon: 'map-marker-outline' as const },
  { labelKey: 'admin.step_location', icon: 'crosshairs-gps' as const },
];

// Small component that lazily fetches addresses for a single user card
function UserCardAddresses({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();
  const { data: addresses } = useGetAdminUserAddressesQuery(userId);
  const [expanded, setExpanded] = useState(false);

  // Sort addresses so default is first
  const sortedAddresses = useMemo(() => {
    if (!addresses) return [];
    return [...addresses].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
  }, [addresses]);

  if (!sortedAddresses || sortedAddresses.length === 0) return null;

  const hasMultiple = sortedAddresses.length > 1;
  const displayAddresses = expanded ? sortedAddresses : sortedAddresses.slice(0, 1);
  const hiddenCount = sortedAddresses.length - 1;

  return (
    <View style={[styles.addressSection, { borderTopColor: appColors.border }]}>
      {displayAddresses.map((addr) => {
        const parts = [addr.address_line1, addr.city, addr.pincode].filter(Boolean);
        const summary = addr.label ? `${addr.label}: ${parts.join(', ')}` : parts.join(', ');
        const isDefault = addr.is_default;

        return (
          <View key={addr.id} style={styles.addressRow}>
            <MaterialCommunityIcons
              name={isDefault ? 'map-marker-check' : 'map-marker-outline'}
              size={16}
              color={isDefault ? appColors.positive : appColors.text.secondary}
              style={styles.addressIcon}
            />
            <Text
              variant="bodySmall"
              style={[styles.addressText, { color: appColors.text.secondary }, isDefault && { fontFamily: fontFamily.semiBold, color: appColors.text.primary }]}
              numberOfLines={1}
            >
              {summary}
            </Text>
            {isDefault && (
              <View style={[styles.defaultBadge, { backgroundColor: appColors.positiveLight }]}>
                <Text style={[styles.defaultBadgeText, { color: appColors.positive }]}>{t('admin.defaultAddress')}</Text>
              </View>
            )}
          </View>
        );
      })}
      {hasMultiple && (
        <Pressable
          style={styles.showMoreRow}
          onPress={() => setExpanded(!expanded)}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={appColors.brand}
          />
          <Text variant="labelSmall" style={[styles.showMoreText, { color: appColors.brand }]}>
            {expanded ? t('admin.showLessAddresses') : t('admin.showMoreAddresses', { count: hiddenCount })}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function UsersScreen() {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();

  const ROLE_BADGE_STYLES: Record<UserRole, { bg: string; text: string }> = {
    customer: { bg: appColors.informativeLight, text: appColors.informative },
    admin: { bg: appColors.criticalLight, text: appColors.critical },
    delivery_staff: { bg: appColors.positiveLight, text: appColors.positive },
  };

  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void; confirmLabel: string; variant?: ButtonVariant } | null>(null);

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build query params
  const queryParams: GetUsersParams = useMemo(() => {
    const params: GetUsersParams = { limit: PAGE_SIZE, offset: currentOffset };
    if (debouncedSearch) params.search = debouncedSearch;
    if (roleFilter) params.role = roleFilter;
    return params;
  }, [debouncedSearch, roleFilter, currentOffset]);

  const { data: usersResponse, isLoading, isFetching, isError, refetch } = useGetUsersQuery(
    queryParams,
    { pollingInterval: 30_000 },
  );

  // Extract users from response
  const users = usersResponse?.data ?? [];
  const pagination = usersResponse?.pagination;

  const { data: deletionRequests = [] } = useGetDeletionRequestsQuery(undefined, {
    pollingInterval: 30_000,
  });
  const pendingDeletionUserIds = new Set(deletionRequests.map((r) => r.user_id));
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateUserRoleMutation();
  const [processAccountDeletion, { isLoading: isProcessingDeletion }] = useProcessAccountDeletionMutation();
  const [addAdminAddress, { isLoading: isAddingAddress }] = useAddAdminAddressMutation();
  const [updateAdminAddress, { isLoading: isUpdatingAddress }] = useUpdateAdminAddressMutation();
  const [deleteAdminAddress] = useDeleteAdminAddressMutation();

  // Sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
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

  // Update allUsers when query results change
  // Single effect to avoid race conditions between data updates and filter resets
  useEffect(() => {
    // Skip if still fetching after filter change - avoid stale cached data
    if (isFetching) return;

    // Check if we have response data
    if (!usersResponse?.data) return;

    if (currentOffset === 0) {
      // First page or filter changed - replace all
      setAllUsers(usersResponse.data);
    } else {
      // Loading more - append, avoiding duplicates
      setAllUsers((prev) => {
        const existingIds = new Set(prev.map((u) => u.id));
        const newUsers = usersResponse.data.filter((u) => !existingIds.has(u.id));
        return [...prev, ...newUsers];
      });
    }
    setIsLoadingMore(false);
  }, [usersResponse, isFetching, currentOffset]);

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
      setCurrentOffset(0); // Reset pagination when search changes
      setDebouncedSearch(text.trim());
    }, 300);
  }, []);

  const handleRoleFilterChange = useCallback((role: RoleFilter) => {
    setCurrentOffset(0); // Reset pagination - this triggers new query via queryParams
    setRoleFilter(role);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (pagination?.hasMore && !isFetching && !isLoadingMore) {
      setIsLoadingMore(true);
      setCurrentOffset((prev) => prev + PAGE_SIZE);
    }
  }, [pagination?.hasMore, isFetching, isLoadingMore]);

  const getErrorMessage = useCallback((errorCode: string): string => {
    const key = ERROR_CODE_MESSAGES[errorCode];
    return key ? t(key) : t('admin.userSaveFailed');
  }, [t]);

  const openEditSheet = useCallback((user: User) => {
    setSelectedUser(user);
    setFormName(user.name || '');
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
    const userId = selectedUser.id;
    setDialog({
      title: t('admin.deleteAddress'),
      message: t('admin.deleteAddressConfirm'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: async () => {
        setDialog(null);
        try {
          await deleteAdminAddress({ address_id: addr.id, _userId: userId }).unwrap();
        } catch {
          // Error handling without toast
        }
      },
    });
  }, [selectedUser, deleteAdminAddress, t]);

  const handleSave = useCallback(async () => {
    if (!selectedUser) return;

    const origName = selectedUser.name || '';
    const origActive = selectedUser.is_active !== false;

    const nameChanged = formName.trim() !== origName;
    const activeChanged = formActive !== origActive;

    if (!nameChanged && !activeChanged) {
      closeSheet();
      return;
    }

    const payload: { user_id: string; name?: string; is_active?: boolean } = {
      user_id: selectedUser.id,
    };
    if (nameChanged) payload.name = formName.trim();
    if (activeChanged) payload.is_active = formActive;

    try {
      await updateRole(payload).unwrap();
      closeSheet();
    } catch (err: unknown) {
      const errorCode = (err as { data?: string })?.data ?? '';
      setFormError(getErrorMessage(errorCode));
    }
  }, [selectedUser, formName, formActive, updateRole, closeSheet, getErrorMessage]);

  const handleToggleActive = useCallback((user: User) => {
    const isActive = user.is_active !== false;
    const name = user.name || user.phone || '';
    const userId = user.id;

    setDialog({
      title: isActive ? t('admin.blockConfirmTitle') : t('admin.unblockConfirmTitle'),
      message: isActive ? t('admin.blockConfirmMessage', { name }) : t('admin.unblockConfirmMessage', { name }),
      confirmLabel: t('common.confirm'),
      variant: isActive ? 'danger' : 'primary',
      onConfirm: async () => {
        setDialog(null);
        try {
          await updateRole({ user_id: userId, is_active: !isActive }).unwrap();
        } catch {
          // Error handling without toast
        }
      },
    });
  }, [updateRole, t]);

  const renderUserCard = useCallback(({ item, index }: { item: User; index: number }) => {
    const role = item.role || 'customer';
    const isActive = item.is_active !== false;
    const badgeStyle = ROLE_BADGE_STYLES[role];
    const hasPendingDeletion = pendingDeletionUserIds.has(item.id);

    return (
      <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
        <Pressable style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border }, !isActive && styles.cardBlocked]} onPress={() => openEditSheet(item)}>
          <View style={styles.cardRow}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons name="account-circle" size={40} color={isActive ? appColors.neutral : appColors.critical} />
            </View>
            <View style={styles.cardInfo}>
              <Text variant="bodyLarge" style={[styles.userName, { color: appColors.text.primary }]}>
                {item.name || '—'}
              </Text>
              <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: 2 }}>
                {item.phone || ''}
              </Text>
            </View>
            {!isActive ? (
              <View style={[styles.roleBadge, { backgroundColor: appColors.negativeLight }]}>
                <Text style={[styles.roleBadgeText, { color: appColors.negative }]}>
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
              trackColor={{ false: appColors.critical, true: appColors.positive }}
              ios_backgroundColor={appColors.critical}
              style={styles.activeSwitch}
            />
          </View>
          {hasPendingDeletion && (
            <View style={[styles.deletionBadgeRow, { borderTopColor: appColors.border }]}>
              <MaterialCommunityIcons name="alert-circle" size={16} color={appColors.negative} />
              <Text style={[styles.deletionBadgeText, { color: appColors.negative }]}>{t('admin.deletionRequested')}</Text>
            </View>
          )}
          <UserCardAddresses userId={item.id} />
        </Pressable>
      </Animated.View>
    );
  }, [openEditSheet, handleToggleActive, pendingDeletionUserIds, t, appColors]);

  // List footer component for load more (must be before early returns)
  const ListFooter = useMemo(() => {
    if (!pagination) return null;

    return (
      <View style={styles.listFooter}>
        {/* User count */}
        <Text variant="bodySmall" style={[styles.userCount, { color: appColors.text.secondary }]}>
          {t('admin.showingUsers', { count: allUsers.length, total: pagination.total })}
        </Text>

        {/* Load more button */}
        {pagination.hasMore && (
          <AppButton
            variant="outline"
            size="sm"
            onPress={handleLoadMore}
            loading={isLoadingMore}
            disabled={isLoadingMore}
            style={styles.loadMoreBtn}
          >
            {t('admin.loadMore')}
          </AppButton>
        )}
      </View>
    );
  }, [pagination, allUsers.length, isLoadingMore, handleLoadMore, t, appColors]);

  if (isLoading && users.length === 0) {
    return <UsersSkeleton appColors={appColors} />;
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: appColors.shell }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={appColors.critical} />
        <Text variant="bodyMedium" style={{ color: appColors.critical, marginTop: spacing.md }}>{t('common.error')}</Text>
        <View style={styles.retryContainer}>
          <AppButton variant="secondary" size="sm" onPress={refetch}>
            {t('common.retry')}
          </AppButton>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <View style={styles.searchContainer}>
        <FioriSearchBar
          placeholder={t('admin.searchUsers')}
          value={searchText}
          onChangeText={(text) => { handleSearchChange(text); }}
        />
      </View>

      {/* Role filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsContainer}
        style={styles.filterChipsScroll}
      >
        {ROLE_FILTERS.map((filter) => (
          <FioriChip
            key={filter.value ?? 'all'}
            label={t(filter.labelKey)}
            selected={roleFilter === filter.value}
            onPress={() => handleRoleFilterChange(filter.value)}
          />
        ))}
      </ScrollView>

      {allUsers.length === 0 && !isLoading ? (
        <View style={[styles.centered, { backgroundColor: appColors.shell }]}>
          <MaterialCommunityIcons name="account-search" size={64} color={appColors.neutral} />
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: appColors.text.primary }]}>{t('admin.noUsers')}</Text>
        </View>
      ) : (
        <FlashList
          data={allUsers}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListFooterComponent={ListFooter}
          refreshing={isFetching && currentOffset === 0}
          onRefresh={() => {
            setCurrentOffset(0);
            setAllUsers([]);
            refetch();
          }}
        />
      )}

      {/* Edit User Full-Screen Sheet */}
      <Modal
        visible={sheetVisible}
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={[styles.sheetFull, { backgroundColor: appColors.surface }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.sheetHeader, { borderBottomColor: appColors.border }, { paddingTop: insets.top + spacing.md }]}>
            <Pressable onPress={closeSheet} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={24} color={appColors.text.primary} />
            </Pressable>
            <View style={styles.sheetHeaderCenter}>
              <Text variant="titleMedium" style={[styles.sheetHeaderTitle, { color: appColors.text.primary }]}>
                {t('admin.editUser')}
              </Text>
              {selectedUser && (
                <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: 2 }}>
                  {selectedUser.phone || ''}
                </Text>
              )}
            </View>
            <View style={styles.headerSpacer} />
          </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              {/* Name field */}
              <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('admin.userName')}</Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder={t('admin.userNamePlaceholder')}
                mode="outlined"
                style={[styles.fieldInput, { backgroundColor: appColors.surface }]}
                outlineColor={appColors.border}
                activeOutlineColor={appColors.brand}
                dense
              />

              {/* Phone field (read-only) */}
              <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('profile.phone')}</Text>
              <TextInput
                value={selectedUser?.phone || ''}
                mode="outlined"
                style={[styles.fieldInput, { backgroundColor: appColors.surface }]}
                outlineColor={appColors.border}
                disabled
                dense
              />

              {/* Deletion request banner */}
              {(() => {
                const req = selectedUser ? deletionRequests.find((r) => r.user_id === selectedUser.id) : undefined;
                if (!req) return null;
                const displayName = selectedUser?.name || selectedUser?.phone || '';
                return (
                  <View style={[styles.deletionBanner, { backgroundColor: appColors.negativeLight, borderColor: appColors.negative }]}>
                    <View style={styles.deletionBannerHeader}>
                      <MaterialCommunityIcons name="alert-circle" size={20} color={appColors.negative} />
                      <Text variant="bodyMedium" style={[styles.deletionBannerText, { color: appColors.negative }]}>
                        {t('admin.deletionRequestBanner')}
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: spacing.xs, marginLeft: 20 + spacing.xs }}>
                      {t('admin.deletionRequestDate', { date: new Date(req.created_at).toLocaleDateString() })}
                    </Text>
                    <View style={styles.deletionBannerActions}>
                      <View style={styles.flexOne}>
                        <AppButton
                          variant="outline"
                          size="sm"
                          fullWidth
                          disabled={isProcessingDeletion}
                          onPress={() => {
                            setDialog({
                              title: t('admin.rejectDeletionConfirmTitle'),
                              message: t('admin.rejectDeletionConfirmMessage', { name: displayName }),
                              confirmLabel: t('common.confirm'),
                              variant: 'primary',
                              onConfirm: async () => {
                                setDialog(null);
                                try {
                                  await processAccountDeletion({ requestId: req.id, action: 'rejected' }).unwrap();
                                } catch {
                                  // Error handling without toast
                                }
                              },
                            });
                          }}
                        >
                          {t('admin.rejectDeletion')}
                        </AppButton>
                      </View>
                      <View style={styles.bannerActionGap} />
                      <View style={styles.flexOne}>
                        <AppButton
                          variant="danger"
                          size="sm"
                          fullWidth
                          disabled={isProcessingDeletion}
                          loading={isProcessingDeletion}
                          onPress={() => {
                            setDialog({
                              title: t('admin.approveDeletionConfirmTitle'),
                              message: t('admin.approveDeletionConfirmMessage', { name: displayName }),
                              confirmLabel: t('common.confirm'),
                              variant: 'danger',
                              onConfirm: async () => {
                                setDialog(null);
                                try {
                                  await processAccountDeletion({ requestId: req.id, action: 'approved' }).unwrap();
                                  closeSheet();
                                } catch {
                                  // Error handling without toast
                                }
                              },
                            });
                          }}
                        >
                          {t('admin.approveDeletion')}
                        </AppButton>
                      </View>
                    </View>
                  </View>
                );
              })()}

              {/* Active toggle */}
              <View style={styles.activeRow}>
                <Text variant="bodyMedium" style={[styles.activeLabel, { color: appColors.text.primary }]}>{t('admin.userActive')}</Text>
                <Switch
                  value={formActive}
                  onValueChange={setFormActive}
                  trackColor={{ false: appColors.critical, true: appColors.positive }}
                  ios_backgroundColor={appColors.critical}
                />
              </View>

              {/* Addresses with CRUD */}
              <View style={styles.addressHeaderRow}>
                <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('admin.userAddresses')}</Text>
                <Pressable style={({ pressed }) => [styles.addAddressBtn, pressed && styles.addAddressBtnPressed]} onPress={() => openAddressForm()}>
                  <MaterialCommunityIcons name="plus" size={16} color={appColors.brand} />
                  <Text style={[styles.addAddressBtnText, { color: appColors.brand }]}>{t('admin.addAddress')}</Text>
                </Pressable>
              </View>
              {selectedUserAddresses.length === 0 ? (
                <Text variant="bodySmall" style={{ color: appColors.text.secondary, fontStyle: 'italic', marginTop: spacing.xs }}>{t('admin.noAddresses')}</Text>
              ) : (
                <View style={styles.sheetAddressList}>
                  {selectedUserAddresses.map((addr) => {
                    const parts = [addr.address_line1, addr.city, addr.pincode].filter(Boolean);
                    const summary = addr.label ? `${addr.label}: ${parts.join(', ')}` : parts.join(', ');
                    return (
                      <View key={addr.id} style={[styles.sheetAddressCard, { borderColor: appColors.border }, addr.is_default && { borderColor: appColors.positive, backgroundColor: appColors.positiveLight }]}>
                        <View style={styles.sheetAddressRow}>
                          <MaterialCommunityIcons
                            name={addr.is_default ? 'map-marker-check' : 'map-marker-outline'}
                            size={18}
                            color={addr.is_default ? appColors.positive : appColors.text.secondary}
                          />
                          <Text
                            variant="bodySmall"
                            style={[styles.sheetAddressText, { color: appColors.text.secondary }, addr.is_default && { fontFamily: fontFamily.semiBold, color: appColors.text.primary }]}
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
                            <MaterialCommunityIcons name="pencil-outline" size={18} color={appColors.text.secondary} />
                          </Pressable>
                          <Pressable
                            style={styles.addrActionBtn}
                            onPress={() => handleDeleteAddress(addr)}
                            hitSlop={8}
                          >
                            <MaterialCommunityIcons name="delete-outline" size={18} color={appColors.critical} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Error text */}
              {formError ? (
                <Text variant="bodySmall" style={[styles.formError, { color: appColors.critical }]}>{formError}</Text>
              ) : null}
            </ScrollView>

          <View style={[styles.sheetFooter, { borderTopColor: appColors.border, paddingBottom: insets.bottom + spacing.md }]}>
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

          <FioriDialog
            visible={dialog !== null}
            onDismiss={() => setDialog(null)}
            title={dialog?.title ?? ''}
            actions={[
              { label: t('common.cancel'), onPress: () => setDialog(null), variant: 'text' },
              { label: dialog?.confirmLabel ?? t('common.confirm'), onPress: () => dialog?.onConfirm(), variant: dialog?.variant ?? 'primary' },
            ]}
          >
            <Text variant="bodyMedium">{dialog?.message}</Text>
          </FioriDialog>
        </KeyboardAvoidingView>
      </Modal>

      {/* Address Form — Full-Screen Multi-Step */}
      <Modal
        visible={addressSheetVisible}
        animationType="slide"
        onRequestClose={closeAddressForm}
      >
        <View style={[styles.sheetFull, { backgroundColor: appColors.surface }]}>
          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: appColors.border }, { paddingTop: insets.top + spacing.md }]}>
            <Pressable onPress={closeAddressForm} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={24} color={appColors.text.primary} />
            </Pressable>
            <View style={styles.sheetHeaderCenter}>
              <Text variant="titleMedium" style={[styles.sheetHeaderTitle, { color: appColors.text.primary }]}>
                {editingAddress ? t('admin.editAddress') : t('admin.addAddress')}
              </Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {/* Step Indicator */}
          <View style={[styles.addrStepContainer, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}>
            {ADDR_STEPS.map((step, index) => {
              const isActive = index <= addrStep;
              const isCurrent = index === addrStep;
              const isCompleted = index < addrStep;
              const circleColor = isCurrent
                ? appColors.brand
                : isCompleted
                  ? appColors.positive
                  : appColors.neutralLight;
              const iconColor = isActive ? appColors.text.inverse : appColors.neutral;
              return (
                <View key={index} style={styles.addrStepWrapper}>
                  {index > 0 && (
                    <View
                      style={[
                        styles.addrStepLine,
                        { backgroundColor: isActive ? appColors.positive : appColors.neutralLight },
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
                    style={[styles.addrStepLabel, { color: appColors.neutral }, isActive && { color: appColors.brand, fontFamily: fontFamily.semiBold }]}
                  >
                    {t(step.labelKey)}
                  </Text>
                </View>
              );
            })}
          </View>

          <KeyboardAvoidingView
            style={styles.flexOne}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              {/* Step 0: Contact */}
              {addrStep === 0 && (
                <View style={[styles.addrStepCard, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
                  <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('admin.addressLabel')}</Text>
                  <TextInput
                    value={addrLabel}
                    onChangeText={setAddrLabel}
                    placeholder={t('admin.addressLabelPlaceholder')}
                    mode="outlined"
                    style={[styles.fieldInput, { backgroundColor: appColors.surface }]}
                    outlineColor={appColors.border}
                    activeOutlineColor={appColors.brand}
                    dense
                  />

                  <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('admin.addressFullName')} *</Text>
                  <TextInput
                    value={addrFullName}
                    onChangeText={setAddrFullName}
                    placeholder={t('admin.addressFullNamePlaceholder')}
                    mode="outlined"
                    style={[styles.fieldInput, { backgroundColor: appColors.surface }]}
                    outlineColor={appColors.border}
                    activeOutlineColor={appColors.brand}
                    dense
                  />

                  <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('admin.addressPhone')} *</Text>
                  <TextInput
                    value={addrPhone}
                    onChangeText={setAddrPhone}
                    placeholder={t('admin.addressPhonePlaceholder')}
                    mode="outlined"
                    style={[styles.fieldInput, { backgroundColor: appColors.surface }]}
                    outlineColor={appColors.border}
                    activeOutlineColor={appColors.brand}
                    keyboardType="phone-pad"
                    dense
                  />
                </View>
              )}

              {/* Step 1: Address */}
              {addrStep === 1 && (
                <View style={[styles.addrStepCard, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
                  <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('admin.addressLine1')} *</Text>
                  <PlacesAutocomplete
                    value={addrLine1}
                    onChangeText={setAddrLine1}
                    onPlaceSelected={handlePlaceSelected}
                    placeholder={t('admin.addressLine1Placeholder')}
                  />

                  <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('admin.addressLine2')}</Text>
                  <TextInput
                    value={addrLine2}
                    onChangeText={setAddrLine2}
                    placeholder={t('admin.addressLine2Placeholder')}
                    mode="outlined"
                    style={[styles.fieldInput, { backgroundColor: appColors.surface }]}
                    outlineColor={appColors.border}
                    activeOutlineColor={appColors.brand}
                    dense
                  />

                  <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('admin.addressCity')} *</Text>
                  <TextInput
                    value={addrCity}
                    onChangeText={setAddrCity}
                    placeholder={t('admin.addressCityPlaceholder')}
                    mode="outlined"
                    style={[styles.fieldInput, { backgroundColor: appColors.surface }]}
                    outlineColor={appColors.border}
                    activeOutlineColor={appColors.brand}
                    dense
                  />

                  <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('admin.addressState')}</Text>
                  <TextInput
                    value={addrState}
                    onChangeText={setAddrState}
                    placeholder={t('admin.addressStatePlaceholder')}
                    mode="outlined"
                    style={[styles.fieldInput, { backgroundColor: appColors.surface }]}
                    outlineColor={appColors.border}
                    activeOutlineColor={appColors.brand}
                    dense
                  />

                  <Text variant="bodySmall" style={[styles.fieldLabel, { color: appColors.text.secondary }]}>{t('admin.addressPincode')} *</Text>
                  <TextInput
                    value={addrPincode}
                    onChangeText={setAddrPincode}
                    placeholder={t('admin.addressPincodePlaceholder')}
                    mode="outlined"
                    style={[styles.fieldInput, { backgroundColor: appColors.surface }]}
                    outlineColor={appColors.border}
                    activeOutlineColor={appColors.brand}
                    keyboardType="numeric"
                    maxLength={6}
                    dense
                  />

                  <View style={styles.activeRow}>
                    <Text variant="bodyMedium" style={[styles.activeLabel, { color: appColors.text.primary }]}>{t('admin.addressIsDefault')}</Text>
                    <Switch
                      value={addrIsDefault}
                      onValueChange={setAddrIsDefault}
                      trackColor={{ false: appColors.border, true: appColors.positive }}
                      ios_backgroundColor={appColors.border}
                    />
                  </View>
                </View>
              )}

              {/* Step 2: Map Location */}
              {addrStep === 2 && (
                <View style={[styles.addrStepCard, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
                  {/* Address summary (read-only) */}
                  <View style={[styles.addrSummaryBox, { backgroundColor: appColors.shell }]}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color={appColors.text.secondary} />
                    <Text variant="bodySmall" style={[styles.addrSummaryText, { color: appColors.text.secondary }]}>
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
                <Text variant="bodySmall" style={[styles.formError, { color: appColors.critical }]}>{addrError}</Text>
              ) : null}
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={[styles.sheetFooter, { borderTopColor: appColors.border }, { paddingBottom: insets.bottom + spacing.md }]}>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  retryContainer: {
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    marginTop: spacing.md,
  },
  searchContainer: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterChipsScroll: {
    flexGrow: 0,
  },
  filterChipsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  listFooter: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  userCount: {
    textAlign: 'center',
  },
  loadMoreBtn: {
    minWidth: 120,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
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
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
  },
  deletionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  deletionBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    marginLeft: spacing.xs,
  },
  // Address section on cards
  addressSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  addressIcon: {
    marginRight: spacing.xs,
  },
  addressText: {
    flex: 1,
    fontSize: fontSize.xs,
  },
  defaultBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginLeft: spacing.xs,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
  },
  deletionBanner: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  deletionBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deletionBannerText: {
    fontFamily: fontFamily.semiBold,
    flex: 1,
  },
  deletionBannerActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  flexOne: {
    flex: 1,
  },
  bannerActionGap: {
    width: spacing.sm,
  },
  // Full-screen sheet
  sheetFull: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  sheetHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  sheetHeaderTitle: {
    fontFamily: fontFamily.bold,
  },
  headerSpacer: {
    width: 24,
  },
  sheetScroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  sheetScrollContent: {
    paddingBottom: spacing.lg,
  },
  // Text input spec 06: label 13pt, Regular (400), #556B82
  fieldLabel: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  fieldInput: {},
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeLabel: {
    fontFamily: fontFamily.semiBold,
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
  addAddressBtnPressed: {
    opacity: 0.6,
  },
  addAddressBtnText: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.semiBold,
    marginLeft: spacing.xs,
  },
  addrActionBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  sheetAddressList: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  sheetAddressCard: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  sheetAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetAddressText: {
    flex: 1,
    fontSize: fontSize.label,
    marginLeft: spacing.xs,
  },
  formError: {
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
    borderBottomWidth: 1,
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
    textAlign: 'center',
  },
  addrStepCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...elevation.level1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  addrSummaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  addrSummaryText: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: fontSize.label,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
  skeletonSearchBar: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  skeletonCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...elevation.level1,
  },
  skeletonCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  showMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  showMoreText: {
    fontFamily: fontFamily.semiBold,
  },
});
