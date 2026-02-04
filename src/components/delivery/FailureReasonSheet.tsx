import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, TextInput, RadioButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { FioriBottomSheet } from '../common/FioriBottomSheet';
import { AppButton } from '../common/AppButton';
import { spacing, borderRadius, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
import { FailureReason } from '../../types/delivery';

interface FailureReasonSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (reason: FailureReason, notes?: string) => void;
  loading?: boolean;
}

interface ReasonOption {
  value: FailureReason;
  labelKey: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

const FAILURE_REASONS: ReasonOption[] = [
  { value: 'customer_not_available', labelKey: 'delivery.reasons.customerNotAvailable', icon: 'account-off' },
  { value: 'wrong_address', labelKey: 'delivery.reasons.wrongAddress', icon: 'map-marker-off' },
  { value: 'customer_refused', labelKey: 'delivery.reasons.customerRefused', icon: 'hand-back-left' },
  { value: 'unable_to_contact', labelKey: 'delivery.reasons.unableToContact', icon: 'phone-off' },
  { value: 'other', labelKey: 'delivery.reasons.other', icon: 'dots-horizontal' },
];

export function FailureReasonSheet({
  visible,
  onDismiss,
  onSubmit,
  loading = false,
}: FailureReasonSheetProps) {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();
  const [selectedReason, setSelectedReason] = useState<FailureReason | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!selectedReason) return;
    onSubmit(selectedReason, notes.trim() || undefined);
  };

  const handleDismiss = () => {
    setSelectedReason(null);
    setNotes('');
    onDismiss();
  };

  return (
    <FioriBottomSheet
      visible={visible}
      onDismiss={handleDismiss}
      title={t('delivery.selectReason')}
    >
      <View style={styles.content}>
        <RadioButton.Group
          value={selectedReason || ''}
          onValueChange={(value) => setSelectedReason(value as FailureReason)}
        >
          {FAILURE_REASONS.map((reason) => (
            <Pressable
              key={reason.value}
              style={[
                styles.reasonOption,
                { borderColor: appColors.border },
                selectedReason === reason.value && { borderColor: appColors.negative, backgroundColor: appColors.negativeLight },
              ]}
              onPress={() => setSelectedReason(reason.value)}
            >
              <MaterialCommunityIcons
                name={reason.icon}
                size={22}
                color={selectedReason === reason.value ? appColors.negative : appColors.neutral}
              />
              <Text
                style={[
                  styles.reasonLabel,
                  { color: appColors.text.primary },
                  selectedReason === reason.value && { color: appColors.negative, fontFamily: fontFamily.semiBold },
                ]}
              >
                {t(reason.labelKey)}
              </Text>
              <RadioButton.Android
                value={reason.value}
                color={appColors.negative}
                uncheckedColor={appColors.neutral}
              />
            </Pressable>
          ))}
        </RadioButton.Group>

        {selectedReason === 'other' && (
          <TextInput
            mode="outlined"
            label={t('delivery.additionalNotes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
            outlineColor={appColors.border}
            activeOutlineColor={appColors.brand}
          />
        )}

        <AppButton
          variant="primary"
          size="lg"
          fullWidth
          icon="alert-circle"
          loading={loading}
          disabled={!selectedReason || loading}
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          {t('delivery.submitFailure')}
        </AppButton>
      </View>
    </FioriBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: spacing.sm,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  reasonLabel: {
    flex: 1,
    fontFamily: fontFamily.regular,
  },
  notesInput: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});
