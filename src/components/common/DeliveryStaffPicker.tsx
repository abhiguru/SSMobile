import { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Text, RadioButton, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGetDeliveryStaffQuery } from '../../store/apiSlice';
import { colors, spacing, borderRadius, fontFamily } from '../../constants/theme';
import { DeliveryStaff } from '../../types';
import { AppButton } from './AppButton';
import type { AppTheme } from '../../theme';

interface DeliveryStaffPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (staff: DeliveryStaff) => void;
  loading?: boolean;
}

export function DeliveryStaffPicker({
  visible,
  onClose,
  onSelect,
  loading = false,
}: DeliveryStaffPickerProps) {
  const theme = useTheme<AppTheme>();
  const { data: staffList = [], isLoading, isError, refetch } = useGetDeliveryStaffQuery();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  const handleConfirm = () => {
    if (selectedStaff) {
      onSelect(selectedStaff);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text variant="titleMedium" style={styles.title}>Select Delivery Staff</Text>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="bodyMedium" style={styles.loadingText}>Loading staff...</Text>
            </View>
          ) : isError ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.critical} />
              <Text variant="bodyMedium" style={styles.errorText}>Failed to load delivery staff</Text>
              <View style={styles.retryButton}>
                <AppButton variant="secondary" size="sm" onPress={refetch}>
                  Retry
                </AppButton>
              </View>
            </View>
          ) : staffList.length === 0 ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="account-off-outline" size={48} color={colors.neutral} />
              <Text variant="bodyMedium" style={styles.emptyText}>No delivery staff available</Text>
            </View>
          ) : (
            <ScrollView style={styles.staffList} showsVerticalScrollIndicator={false}>
              <RadioButton.Group
                value={selectedStaffId || ''}
                onValueChange={(value) => setSelectedStaffId(value)}
              >
                {staffList.map((staff) => (
                  <Pressable
                    key={staff.id}
                    style={[
                      styles.staffItem,
                      selectedStaffId === staff.id && styles.staffItemSelected,
                    ]}
                    onPress={() => setSelectedStaffId(staff.id)}
                  >
                    <RadioButton.Android value={staff.id} color={theme.colors.primary} />
                    <View style={styles.staffInfo}>
                      <Text variant="bodyLarge" style={styles.staffName}>{staff.name}</Text>
                      <Text variant="bodySmall" style={styles.staffPhone}>{staff.phone}</Text>
                    </View>
                    {staff.is_available === false && (
                      <View style={styles.busyBadge}>
                        <Text style={styles.busyText}>Busy</Text>
                      </View>
                    )}
                    {staff.is_available === true && (
                      <View style={styles.availableBadge}>
                        <Text style={styles.availableText}>Available</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </RadioButton.Group>
            </ScrollView>
          )}

          <View style={styles.footer}>
            <View style={styles.footerButton}>
              <AppButton
                variant="secondary"
                size="md"
                onPress={onClose}
                fullWidth
              >
                Cancel
              </AppButton>
            </View>
            <View style={styles.footerButton}>
              <AppButton
                variant="primary"
                size="md"
                onPress={handleConfirm}
                disabled={!selectedStaffId || loading}
                loading={loading}
                fullWidth
              >
                Assign
              </AppButton>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '80%',
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
  title: {
    fontFamily: fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.critical,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
  },
  staffList: {
    maxHeight: 300,
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.shell,
  },
  staffItemSelected: {
    backgroundColor: colors.brandLight,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  staffInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  staffName: {
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
  },
  staffPhone: {
    color: colors.text.secondary,
  },
  busyBadge: {
    backgroundColor: colors.criticalLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  busyText: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    color: colors.critical,
  },
  availableBadge: {
    backgroundColor: colors.positiveLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  availableText: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    color: colors.positive,
  },
  footer: {
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
