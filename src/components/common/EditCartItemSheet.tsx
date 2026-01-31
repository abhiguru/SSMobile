import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { FioriBottomSheet } from './FioriBottomSheet';
import { AppButton } from './AppButton';
import { StepperControl } from './StepperControl';
import { PriceText } from './PriceText';
import { formatPrice, getPerKgPaise } from '../../constants';
import { colors, spacing } from '../../constants/theme';
import { hapticLight } from '../../utils/haptics';
import type { CartItem } from '../../types';
const WEIGHT_INCREMENTS = [
  { label: '+10g', grams: 10 },
  { label: '+100g', grams: 100 },
  { label: '+500g', grams: 500 },
  { label: '+1kg', grams: 1000 },
];

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return Number.isInteger(kg) ? `${kg} kg` : `${kg.toFixed(1)} kg`;
  }
  return `${grams}g`;
}

interface EditCartItemSheetProps {
  item: CartItem | null;
  onDismiss: () => void;
  onUpdate: (newWeightGrams: number, newQuantity: number) => void;
}

export function EditCartItemSheet({ item, onDismiss, onUpdate }: EditCartItemSheetProps) {
  const { t, i18n } = useTranslation();
  const isGujarati = i18n.language === 'gu';

  const [weightGrams, setWeightGrams] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setWeightGrams(item.weight_grams);
      setQuantity(item.quantity);
    }
  }, [item]);

  const handleUpdate = useCallback(() => {
    onUpdate(weightGrams, quantity);
    onDismiss();
  }, [onUpdate, onDismiss, weightGrams, quantity]);

  const handleAddWeight = useCallback((grams: number) => {
    hapticLight();
    setWeightGrams((prev) => prev + grams);
  }, []);

  const handleResetWeight = useCallback(() => {
    hapticLight();
    setWeightGrams(0);
  }, []);

  if (!item) return null;

  const productName = isGujarati ? item.product.name_gu : item.product.name;
  const perKgPaise = getPerKgPaise(item.product);
  const computedPrice = Math.round(perKgPaise * weightGrams / 1000 * quantity);

  return (
    <FioriBottomSheet visible={!!item} onDismiss={onDismiss} title={productName}>
      <Text variant="bodySmall" style={styles.perKgLabel}>
        {formatPrice(perKgPaise)}{t('product.perKg')}
      </Text>

      <Text variant="titleSmall" style={styles.sectionTitle}>
        {t('product.selectWeight')}
      </Text>
      <View style={styles.weightRow}>
        {WEIGHT_INCREMENTS.map((inc) => (
          <AppButton
            key={inc.grams}
            variant="outline"
            size="sm"
            onPress={() => handleAddWeight(inc.grams)}
          >
            {inc.label}
          </AppButton>
        ))}
        {weightGrams > 0 && (
          <AppButton variant="secondary" size="sm" onPress={handleResetWeight}>
            {t('product.resetWeight')}
          </AppButton>
        )}
      </View>

      <View style={styles.weightDisplay}>
        <Text variant="headlineMedium" style={styles.weightValue}>
          {weightGrams > 0 ? formatWeight(weightGrams) : '0g'}
        </Text>
      </View>

      <View style={styles.quantitySection}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
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
            disabled={weightGrams === 0}
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
  perKgLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  weightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  weightValue: {
    fontWeight: 'bold',
    color: colors.text.primary,
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
