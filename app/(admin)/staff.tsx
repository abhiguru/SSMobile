import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { Switch } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, fontFamily, elevation } from '../../src/constants/theme';
import {
  useGetAllDeliveryStaffQuery,
  useUpdateDeliveryStaffMutation,
} from '../../src/store/apiSlice';
import { DeliveryStaff } from '../../src/types';
import { AppButton } from '../../src/components/common/AppButton';
import { FioriBottomSheet } from '../../src/components/common/FioriBottomSheet';
import { FioriDialog } from '../../src/components/common/FioriDialog';
import { useToast } from '../../src/components/common/Toast';

export default function StaffScreen() {
  const { t } = useTranslation();
  const { data: staffList = [], isLoading, isError, refetch } = useGetAllDeliveryStaffQuery();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateDeliveryStaffMutation();

  const { showToast } = useToast();
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
      showToast({ message: t('admin.staffCannotDeactivate'), type: 'error' });
      return;
    }

    setToggleTarget(staff);
    setToggleDialogVisible(true);
  }, [showToast, t]);

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
      showToast({ message: mapErrorCode(errorData, t), type: 'error' });
    }
    setToggleTarget(null);
  }, [toggleTarget, updateStaff, showToast, t]);

  const renderStaffCard = useCallback(({ item }: { item: DeliveryStaff }) => {
    const isActive = item.is_active !== false;
    const isDelivering = isActive && item.current_order_id;

    return (
      <Pressable
        style={[styles.card, !isActive && styles.cardInactive]}
        onPress={() => openEditSheet(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIdentity}>
            <View style={[styles.avatar, !isActive && styles.avatarInactive]}>
              <MaterialCommunityIcons
                name="account"
                size={24}
                color={isActive ? colors.brand : colors.neutral}
              />
            </View>
            <View style={styles.cardInfo}>
              <Text
                variant="bodyLarge"
                style={[styles.staffName, !isActive && styles.textInactive]}
              >
                {item.name}
              </Text>
              <Text variant="bodySmall" style={styles.staffPhone}>
                {item.phone}
              </Text>
            </View>
          </View>
          <Switch
            value={isActive}
            onValueChange={() => handleToggleActive(item)}
            trackColor={{ false: colors.border, true: colors.brand }}
            thumbColor={colors.surface}
          />
        </View>

        <View style={styles.cardFooter}>
          {isActive ? (
            isDelivering ? (
              <View style={styles.deliveringBadge}>
                <MaterialCommunityIcons name="truck-delivery" size={14} color={colors.critical} />
                <Text style={styles.deliveringText}>
                  {t('admin.staffDeliveringOrder', {
                    orderId: (item.current_order_id || '').slice(-6).toUpperCase(),
                  })}
                </Text>
              </View>
            ) : (
              <View style={styles.freeBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color={colors.positive} />
                <Text style={styles.freeText}>{t('admin.staffFree')}</Text>
              </View>
            )
          ) : (
            <View style={styles.inactiveBadge}>
              <MaterialCommunityIcons name="account-off" size={14} color={colors.neutral} />
              <Text style={styles.inactiveText}>{t('admin.staffInactive')}</Text>
            </View>
          )}
          <Pressable
            style={styles.editButton}
            onPress={() => openEditSheet(item)}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="pencil" size={18} color={colors.text.secondary} />
          </Pressable>
        </View>
      </Pressable>
    );
  }, [openEditSheet, handleToggleActive, t]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
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
      {sortedStaff.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="account-group" size={64} color={colors.neutral} />
          <Text variant="headlineSmall" style={styles.emptyTitle}>{t('admin.noStaff')}</Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>{t('admin.noStaffSub')}</Text>
        </View>
      ) : (
        <FlashList
          data={sortedStaff}
          renderItem={renderStaffCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
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
            style={styles.input}
            autoCapitalize="words"
            outlineColor={colors.fieldBorder}
            activeOutlineColor={colors.brand}
          />

          {editingStaff && (
            <TextInput
              label={t('admin.staffPhone')}
              value={editingStaff.phone}
              mode="outlined"
              style={styles.input}
              disabled
              outlineColor={colors.fieldBorder}
            />
          )}

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
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.text.secondary,
  },
  listContent: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.brandTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInactive: {
    backgroundColor: colors.neutralLight,
  },
  cardInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  staffName: {
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
  },
  textInactive: {
    color: colors.text.secondary,
  },
  staffPhone: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.positiveLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  freeText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.positive,
  },
  deliveringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.criticalLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  deliveringText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.critical,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutralLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  inactiveText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral,
  },
  editButton: {
    padding: spacing.xs,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  formError: {
    color: colors.critical,
    marginBottom: spacing.md,
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
