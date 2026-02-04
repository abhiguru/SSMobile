import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput } from 'react-native-paper';
import { Switch } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { spacing, borderRadius, fontFamily, elevation } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme/useAppTheme';
import {
  useGetAllDeliveryStaffQuery,
  useUpdateDeliveryStaffMutation,
} from '../../src/store/apiSlice';
import { DeliveryStaff } from '../../src/types';
import { AppButton } from '../../src/components/common/AppButton';
import { FioriBottomSheet } from '../../src/components/common/FioriBottomSheet';
import { FioriDialog } from '../../src/components/common/FioriDialog';
import { SkeletonBox, SkeletonText } from '../../src/components/common/SkeletonLoader';

function StaffSkeleton() {
  return (
    <View style={{ padding: spacing.lg }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <SkeletonBox width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <SkeletonText lines={1} width="50%" />
              <SkeletonText lines={1} width="35%" style={{ marginTop: spacing.xs }} />
            </View>
            <SkeletonBox width={50} height={30} borderRadius={borderRadius.md} />
          </View>
          <View style={styles.skeletonFooter}>
            <SkeletonBox width={80} height={24} borderRadius={borderRadius.sm} />
            <SkeletonBox width={24} height={24} borderRadius={borderRadius.xs} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function StaffScreen() {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();
  const { data: staffList = [], isLoading, isFetching, isError, refetch } = useGetAllDeliveryStaffQuery();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateDeliveryStaffMutation();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<DeliveryStaff | null>(null);
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState('');
  const [toggleDialogVisible, setToggleDialogVisible] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<DeliveryStaff | null>(null);

  const sortedStaff = useMemo(() => {
    return [...staffList].sort((a, b) => {
      // Active first
      const aActive = a.is_active !== false ? 1 : 0;
      const bActive = b.is_active !== false ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      // Then alphabetical
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [staffList]);

  const openEditSheet = useCallback((staff: DeliveryStaff) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormError('');
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setEditingStaff(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError(t('admin.staffMissingName'));
      return;
    }

    if (!editingStaff) return;

    try {
      await updateStaff({ staff_id: editingStaff.id, name: trimmedName }).unwrap();
      closeSheet();
    } catch (err: unknown) {
      const errorData = (err as { data?: string })?.data || '';
      setFormError(mapErrorCode(errorData, t));
    }
  }, [formName, editingStaff, updateStaff, closeSheet, t]);

  const handleToggleActive = useCallback((staff: DeliveryStaff) => {
    const willDeactivate = staff.is_active !== false;

    if (willDeactivate && staff.current_order_id) {
      return;
    }

    setToggleTarget(staff);
    setToggleDialogVisible(true);
  }, [t]);

  const confirmToggleActive = useCallback(async () => {
    if (!toggleTarget) return;
    const willDeactivate = toggleTarget.is_active !== false;
    setToggleDialogVisible(false);
    try {
      await updateStaff({
        staff_id: toggleTarget.id,
        is_active: !willDeactivate,
      }).unwrap();
    } catch (err: unknown) {
      const errorData = (err as { data?: string })?.data || '';
      console.log('[Staff] toggle error:', mapErrorCode(errorData, t));
    }
    setToggleTarget(null);
  }, [toggleTarget, updateStaff, t]);

  const renderStaffCard = useCallback(({ item, index }: { item: DeliveryStaff; index: number }) => {
    const isActive = item.is_active !== false;
    const isDelivering = isActive && item.current_order_id;

    return (
      <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
        <Pressable
          style={[styles.card, { backgroundColor: appColors.surface }, !isActive && styles.cardInactive]}
          onPress={() => openEditSheet(item)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIdentity}>
              <View style={[styles.avatar, { backgroundColor: isActive ? appColors.brandTint : appColors.neutralLight }]}>
                <MaterialCommunityIcons
                  name="account"
                  size={24}
                  color={isActive ? appColors.brand : appColors.neutral}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text
                  variant="bodyLarge"
                  style={[styles.staffName, { color: appColors.text.primary }, !isActive && { color: appColors.text.secondary }]}
                >
                  {item.name}
                </Text>
                <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: 2 }}>
                  {item.phone}
                </Text>
              </View>
            </View>
            <Switch
              value={isActive}
              onValueChange={() => handleToggleActive(item)}
              trackColor={{ false: appColors.border, true: appColors.brand }}
              thumbColor={appColors.surface}
            />
          </View>

          <View style={[styles.cardFooter, { borderTopColor: appColors.border }]}>
            {isActive ? (
              isDelivering ? (
                <View style={[styles.deliveringBadge, { backgroundColor: appColors.criticalLight }]}>
                  <MaterialCommunityIcons name="truck-delivery" size={14} color={appColors.critical} />
                  <Text style={[styles.deliveringText, { color: appColors.critical }]}>
                    {t('admin.staffDeliveringOrder', {
                      orderId: (item.current_order_id || '').slice(-6).toUpperCase(),
                    })}
                  </Text>
                </View>
              ) : (
                <View style={[styles.freeBadge, { backgroundColor: appColors.positiveLight }]}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={appColors.positive} />
                  <Text style={[styles.freeText, { color: appColors.positive }]}>{t('admin.staffFree')}</Text>
                </View>
              )
            ) : (
              <View style={[styles.inactiveBadge, { backgroundColor: appColors.neutralLight }]}>
                <MaterialCommunityIcons name="account-off" size={14} color={appColors.neutral} />
                <Text style={[styles.inactiveText, { color: appColors.neutral }]}>{t('admin.staffInactive')}</Text>
              </View>
            )}
            <Pressable
              style={styles.editButton}
              onPress={() => openEditSheet(item)}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color={appColors.text.secondary} />
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    );
  }, [openEditSheet, handleToggleActive, t, appColors]);

  if (isLoading && staffList.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: appColors.shell }]}>
        <StaffSkeleton />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: appColors.shell }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={appColors.critical} />
        <Text variant="bodyMedium" style={{ color: appColors.critical, marginTop: spacing.md }}>{t('common.error')}</Text>
        <View style={{ marginTop: spacing.md }}>
          <AppButton variant="secondary" size="sm" onPress={refetch}>
            {t('common.retry')}
          </AppButton>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      {sortedStaff.length === 0 ? (
        <View style={[styles.centered, { backgroundColor: appColors.shell }]}>
          <MaterialCommunityIcons name="account-group" size={64} color={appColors.neutral} />
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: appColors.text.primary }]}>{t('admin.noStaff')}</Text>
          <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>{t('admin.noStaffSub')}</Text>
        </View>
      ) : (
        <FlashList
          data={sortedStaff}
          renderItem={renderStaffCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshing={isFetching}
          onRefresh={refetch}
        />
      )}

      <FioriDialog
        visible={toggleDialogVisible}
        onDismiss={() => { setToggleDialogVisible(false); setToggleTarget(null); }}
        title={toggleTarget && toggleTarget.is_active !== false ? t('admin.deactivateConfirmTitle') : t('admin.reactivateConfirmTitle')}
        actions={[
          { label: t('common.cancel'), onPress: () => { setToggleDialogVisible(false); setToggleTarget(null); }, variant: 'text' },
          { label: t('common.confirm'), onPress: confirmToggleActive, variant: toggleTarget && toggleTarget.is_active !== false ? 'danger' : 'primary' },
        ]}
      >
        <Text variant="bodyMedium">
          {toggleTarget && toggleTarget.is_active !== false ? t('admin.deactivateConfirmMessage') : t('admin.reactivateConfirmMessage')}
        </Text>
      </FioriDialog>

      {/* Edit Bottom Sheet */}
      <FioriBottomSheet visible={sheetVisible} onDismiss={closeSheet} title={t('admin.editStaff')}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <TextInput
            label={t('admin.staffName')}
            placeholder={t('admin.staffNamePlaceholder')}
            value={formName}
            onChangeText={(v) => { setFormName(v); setFormError(''); }}
            mode="outlined"
            style={[styles.input, { backgroundColor: appColors.surface }]}
            autoCapitalize="words"
            outlineColor={appColors.fieldBorder}
            activeOutlineColor={appColors.brand}
          />

          {editingStaff && (
            <TextInput
              label={t('admin.staffPhone')}
              value={editingStaff.phone}
              mode="outlined"
              style={[styles.input, { backgroundColor: appColors.surface }]}
              disabled
              outlineColor={appColors.fieldBorder}
            />
          )}

          {formError ? (
            <Text variant="bodySmall" style={{ color: appColors.critical, marginBottom: spacing.md }}>{formError}</Text>
          ) : null}
        </ScrollView>

        <View style={[styles.sheetFooter, { borderTopColor: appColors.border }]}>
          <View style={styles.footerButton}>
            <AppButton variant="secondary" size="md" onPress={closeSheet} fullWidth>
              {t('common.cancel')}
            </AppButton>
          </View>
          <View style={styles.footerButton}>
            <AppButton
              variant="primary"
              size="md"
              onPress={handleSubmit}
              loading={isUpdating}
              disabled={isUpdating}
              fullWidth
            >
              {t('common.save')}
            </AppButton>
          </View>
        </View>
      </FioriBottomSheet>
    </View>
  );
}

function mapErrorCode(code: string, t: (key: string) => string): string {
  switch (code) {
    case 'STAFF_ALREADY_EXISTS': return t('admin.staffAlreadyExists');
    case 'PHONE_IN_USE': return t('admin.staffPhoneInUse');
    case 'INVALID_PHONE': return t('admin.staffInvalidPhone');
    case 'MISSING_NAME': return t('admin.staffMissingName');
    case 'STAFF_NOT_FOUND': return t('admin.staffNotFound');
    case 'STAFF_HAS_ACTIVE_DELIVERY': return t('admin.staffCannotDeactivate');
    default: return code || t('common.error');
  }
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
  emptyTitle: {
    fontFamily: fontFamily.bold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...elevation.level1,
  },
  cardInactive: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  staffName: {
    fontFamily: fontFamily.semiBold,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  freeText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
  },
  deliveringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  deliveringText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  inactiveText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
  },
  editButton: {
    padding: spacing.xs,
  },
  input: {
    marginBottom: spacing.md,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
  skeletonCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation.level1,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
});
