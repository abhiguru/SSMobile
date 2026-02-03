import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { FioriBottomSheet } from './FioriBottomSheet';
import { AppButton } from './AppButton';
import { StepperControl } from './StepperControl';
import { PriceText } from './PriceText';
import { formatPrice } from '../../constants';
import { spacing, borderRadius, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
import { hapticLight } from '../../utils/haptics';
import type { ServerCartItem, WeightOption } from '../../types';

function formatWeight(grams: number, label?: string): string {
  if (label) return label;
  if (grams >= 1000) {
    const kg = grams / 1000;
    return Number.isInteger(kg) ? `${kg} kg` : `${kg.toFixed(1)} kg`;
  }
  return `${grams}g`;
}

interface EditCartItemSheetProps {
  item: ServerCartItem | null;
  weightOptions: WeightOption[];
  onDismiss: () => void;
  onUpdate: (newWeightOptionId: string, newQuantity: number) => void;
}

export function EditCartItemSheet({ item, weightOptions, onDismiss, onUpdate }: EditCartItemSheetProps) {
  const { t, i18n } = useTranslation();
  const { appColors } = useAppTheme();
  const isGujarati = i18n.language === 'gu';

  const [selectedWeightOptionId, setSelectedWeightOptionId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setSelectedWeightOptionId(item.weight_option_id);
      setQuantity(item.quantity);
    }
  }, [item]);

  const selectedWeightOption = weightOptions.find((wo) => wo.id === selectedWeightOptionId);
  const computedPrice = selectedWeightOption ? selectedWeightOption.price_paise * quantity : 0;

  const handleUpdate = useCallback(() => {
    if (selectedWeightOptionId) {
      onUpdate(selectedWeightOptionId, quantity);
      onDismiss();
    }
  }, [onUpdate, onDismiss, selectedWeightOptionId, quantity]);

  const handleSelectWeight = useCallback((optionId: string) => {
    hapticLight();
    setSelectedWeightOptionId(optionId);
  }, []);

  if (!item) return null;

  const productName = isGujarati && item.product?.name_gu ? item.product.name_gu : item.product?.name;

  return (
    <FioriBottomSheet visible={!!item} onDismiss={onDismiss} title={productName}>
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.primary }]}>
        {t('product.selectWeight')}
      </Text>

      <View style={styles.weightOptions}>
        {weightOptions.map((option) => {
          const isSelected = selectedWeightOptionId === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => handleSelectWeight(option.id)}
              style={[
                styles.weightOption,
                {
                  borderColor: isSelected ? appColors.brand : appColors.border,
                  backgroundColor: isSelected ? appColors.brandTint : appColors.surface,
                },
              ]}
            >
              <Text
                variant="titleSmall"
                style={[
                  styles.weightOptionLabel,
                  { color: isSelected ? appColors.brand : appColors.text.primary },
                ]}
              >
                {formatWeight(option.weight_grams, option.weight_label)}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: isSelected ? appColors.brand : appColors.text.secondary }}
              >
                {formatPrice(option.price_paise)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.quantitySection}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.primary }]}>
          {t('product.quantity')}
        </Text>
        <StepperControl
          value={quantity}
          onValueChange={setQuantity}
          min={1}
          max={99}
        />
      </View>

      <View style={styles.footer}>
        <PriceText paise={computedPrice} variant="headlineSmall" />
        <View style={styles.updateBtn}>
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            disabled={!selectedWeightOptionId}
            onPress={handleUpdate}
          >
            {t('cart.updateItem')}
          </AppButton>
        </View>
      </View>
    </FioriBottomSheet>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  weightOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  weightOption: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  weightOptionLabel: {
    fontFamily: fontFamily.semiBold,
    marginBottom: 2,
  },
  quantitySection: {
    marginBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  updateBtn: {
    flex: 1,
  },
});
