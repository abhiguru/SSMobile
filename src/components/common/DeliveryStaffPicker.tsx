import { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Text, RadioButton, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGetDeliveryStaffQuery } from '../../store/apiSlice';
import { spacing, borderRadius, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
import { DeliveryStaff } from '../../types';
import { AppButton } from './AppButton';

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
  const { appColors, colors: themeColors } = useAppTheme();
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
        <View style={[styles.sheet, { backgroundColor: appColors.surface }]}>
          <View style={[styles.handle, { backgroundColor: appColors.border }]} />
          <Text variant="titleMedium" style={[styles.title, { color: appColors.text.primary }]}>Select Delivery Staff</Text>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text variant="bodyMedium" style={[styles.loadingText, { color: appColors.text.secondary }]}>Loading staff...</Text>
            </View>
          ) : isError ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={appColors.critical} />
              <Text variant="bodyMedium" style={[styles.errorText, { color: appColors.critical }]}>Failed to load delivery staff</Text>
              <View style={styles.retryButton}>
                <AppButton variant="secondary" size="sm" onPress={refetch}>
                  Retry
                </AppButton>
              </View>
            </View>
          ) : staffList.length === 0 ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="account-off-outline" size={48} color={appColors.neutral} />
              <Text variant="bodyMedium" style={[styles.emptyText, { color: appColors.text.secondary }]}>No delivery staff available</Text>
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
                      { backgroundColor: appColors.shell },
                      selectedStaffId === staff.id && {
                        backgroundColor: appColors.brandLight,
                        borderWidth: 1,
                        borderColor: appColors.brand,
                      },
                    ]}
                    onPress={() => setSelectedStaffId(staff.id)}
                  >
                    <RadioButton.Android value={staff.id} color={themeColors.primary} />
                    <View style={styles.staffInfo}>
                      <Text variant="bodyLarge" style={[styles.staffName, { color: appColors.text.primary }]}>{staff.name}</Text>
                      <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{staff.phone}</Text>
                    </View>
                    {staff.is_available === false && (
                      <View style={[styles.busyBadge, { backgroundColor: appColors.criticalLight }]}>
                        <Text style={[styles.busyText, { color: appColors.critical }]}>Busy</Text>
                      </View>
                    )}
                    {staff.is_available === true && (
                      <View style={[styles.availableBadge, { backgroundColor: appColors.positiveLight }]}>
                        <Text style={[styles.availableText, { color: appColors.positive }]}>Available</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </RadioButton.Group>
            </ScrollView>
          )}

          <View style={[styles.footer, { borderTopColor: appColors.border }]}>
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
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.bold,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
  },
  errorText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
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
  },
  staffInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  staffName: {
    fontFamily: fontFamily.semiBold,
  },
  busyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  busyText: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
  },
  availableBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  availableText: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
});
