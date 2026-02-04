import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { FioriBottomSheet } from './FioriBottomSheet';
import { AppButton } from './AppButton';
import { StepperControl } from './StepperControl';
import { PriceText } from './PriceText';
import { formatPrice, toGujaratiNumerals } from '../../constants';
import { spacing, borderRadius, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
import { hapticLight } from '../../utils/haptics';
import type { ServerCartItem } from '../../types';

const PRESET_WEIGHTS = [
  { grams: 10 },
  { grams: 100 },
  { grams: 500 },
  { grams: 1000 },
];

const MAX_CUSTOM_WEIGHT_GRAMS = 25000; // 25kg max

interface EditCartItemSheetProps {
  item: ServerCartItem | null;
  onDismiss: () => void;
  onUpdate: (newWeightGrams: number, newQuantity: number) => void;
}

export function EditCartItemSheet({ item, onDismiss, onUpdate }: EditCartItemSheetProps) {
  const { t, i18n } = useTranslation();
  const { appColors } = useAppTheme();
  const isGujarati = i18n.language === 'gu';

  const [quantity, setQuantity] = useState(1);
  const [accumulatedGrams, setAccumulatedGrams] = useState(0);

  // Format weight with translations and Gujarati numerals
  const formatWeight = useCallback((grams: number) => {
    const toNum = isGujarati ? toGujaratiNumerals : String;
    if (grams >= 1000) {
      const kg = grams / 1000;
      const value = toNum(Number.isInteger(kg) ? kg : kg.toFixed(1));
      return t('product.weightKg', { value });
    }
    return t('product.weightGrams', { value: toNum(grams) });
  }, [t, isGujarati]);

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
      setAccumulatedGrams(item.weight_grams);
    }
  }, [item]);

  // Calculate price dynamically based on price_per_kg_paise
  const computedPrice = useMemo(() => {
    if (!item || accumulatedGrams === 0) return 0;
    return Math.round(item.price_per_kg_paise * accumulatedGrams / 1000) * quantity;
  }, [item, accumulatedGrams, quantity]);

  // Calculate incremental price for each preset button
  const getPresetPrice = useCallback((grams: number) => {
    if (!item) return 0;
    return Math.round(item.price_per_kg_paise * grams / 1000);
  }, [item]);

  const handleAddWeight = useCallback((grams: number) => {
    hapticLight();
    setAccumulatedGrams((prev) => Math.min(prev + grams, MAX_CUSTOM_WEIGHT_GRAMS));
  }, []);

  const handleClearWeight = useCallback(() => {
    hapticLight();
    setAccumulatedGrams(0);
  }, []);

  const handleUpdate = useCallback(() => {
    onUpdate(accumulatedGrams, quantity);
    onDismiss();
  }, [onUpdate, onDismiss, accumulatedGrams, quantity]);

  if (!item) return null;

  const productName = isGujarati && item.product_name_gu ? item.product_name_gu : item.product_name;
  const isUpdateDisabled = accumulatedGrams < 10;

  return (
    <FioriBottomSheet visible={!!item} onDismiss={onDismiss} title={productName}>
      {/* Weight accumulator section */}
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.primary }]}>
        {t('product.selectWeight')}
      </Text>

      {/* Preset weight buttons */}
      <View style={styles.weightOptions}>
        {PRESET_WEIGHTS.map((preset) => (
          <Pressable
            key={preset.grams}
            onPress={() => handleAddWeight(preset.grams)}
            disabled={accumulatedGrams + preset.grams > MAX_CUSTOM_WEIGHT_GRAMS}
            style={[
              styles.weightOption,
              {
                borderColor: appColors.brand,
                backgroundColor: appColors.brandTint,
                opacity: accumulatedGrams + preset.grams > MAX_CUSTOM_WEIGHT_GRAMS ? 0.5 : 1,
              },
            ]}
          >
            <Text
              variant="titleSmall"
              style={[styles.weightOptionLabel, { color: appColors.brand }]}
            >
              {formatWeight(preset.grams)}
            </Text>
            <Text variant="bodySmall" style={{ color: appColors.brand }}>
              +{formatPrice(getPresetPrice(preset.grams), isGujarati)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Selected weight summary */}
      <View style={styles.customWeightSummary}>
        <View style={styles.customWeightRow}>
          <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>
            {t('product.selectedWeight')}:
          </Text>
          <View style={styles.customWeightValue}>
            <Text variant="titleMedium" style={[styles.accumulatedWeight, { color: appColors.text.primary }]}>
              {formatWeight(accumulatedGrams)}
            </Text>
            {accumulatedGrams > 0 && (
              <IconButton
                icon="close-circle"
                iconColor={appColors.text.secondary}
                size={20}
                onPress={handleClearWeight}
                style={styles.clearButton}
              />
            )}
          </View>
        </View>
        {accumulatedGrams > 0 && accumulatedGrams < 10 && (
          <Text variant="bodySmall" style={{ color: appColors.negative, marginTop: spacing.xs }}>
            {t('product.minWeight')}
          </Text>
        )}
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
            disabled={isUpdateDisabled}
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
  customWeightSummary: {
    marginBottom: spacing.lg,
  },
  customWeightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customWeightValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accumulatedWeight: {
    fontFamily: fontFamily.semiBold,
  },
  clearButton: {
    margin: 0,
    marginLeft: spacing.xs,
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
