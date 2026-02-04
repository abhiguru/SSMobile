import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { FioriBottomSheet } from './FioriBottomSheet';
import { AppButton } from './AppButton';
import { PriceText } from './PriceText';
import { formatPrice } from '../../constants';
import { spacing, borderRadius, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptics';
import { formatWeight } from '../../utils/formatters';
import { useAddToCartMutation } from '../../store/apiSlice';
import type { Product } from '../../types';

const PRESET_WEIGHTS = [
  { grams: 10 },
  { grams: 100 },
  { grams: 500 },
  { grams: 1000 },
];

const MAX_CUSTOM_WEIGHT_GRAMS = 25000; // 25kg max

interface QuickAddSheetProps {
  product: Product | null;
  onDismiss: () => void;
}

export function QuickAddSheet({ product, onDismiss }: QuickAddSheetProps) {
  const { t, i18n } = useTranslation();
  const { appColors } = useAppTheme();
  const isGujarati = i18n.language === 'gu';

  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();

  // Memoized weight formatter with translations and Gujarati numerals
  const formatWeightDisplay = useCallback((grams: number) => {
    return formatWeight(grams, { useGujarati: isGujarati, t });
  }, [t, isGujarati]);

  const [accumulatedGrams, setAccumulatedGrams] = useState(0);

  useEffect(() => {
    if (product) {
      setAccumulatedGrams(0);
    }
  }, [product]);

  // Calculate price for custom weight
  const customWeightPrice = useMemo(() => {
    if (!product || accumulatedGrams === 0) return 0;
    return Math.round(product.price_per_kg_paise * accumulatedGrams / 1000);
  }, [product, accumulatedGrams]);

  // Calculate incremental price for each preset button
  const getPresetPrice = useCallback((grams: number) => {
    if (!product) return 0;
    return Math.round(product.price_per_kg_paise * grams / 1000);
  }, [product]);

  const handleAddWeight = useCallback((grams: number) => {
    hapticLight();
    setAccumulatedGrams((prev) => Math.min(prev + grams, MAX_CUSTOM_WEIGHT_GRAMS));
  }, []);

  const handleClearWeight = useCallback(() => {
    hapticLight();
    setAccumulatedGrams(0);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!product) return;

    if (accumulatedGrams < 10) {
      hapticError();
      return;
    }

    try {
      await addToCart({
        p_product_id: product.id,
        p_weight_grams: accumulatedGrams,
        p_quantity: 1,
      }).unwrap();

      // Reset state and dismiss first
      setAccumulatedGrams(0);
      onDismiss();
      hapticSuccess();
    } catch (err) {
      console.log('[QuickAddSheet] addToCart error:', err);
      hapticError();
    }
  }, [addToCart, product, accumulatedGrams, t, onDismiss]);

  if (!product) return null;

  const productName = isGujarati ? product.name_gu : product.name;

  // Determine if add button should be disabled
  const isAddDisabled = accumulatedGrams < 10 || isAdding;

  return (
    <FioriBottomSheet visible={!!product} onDismiss={onDismiss} title={productName}>
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.primary }]}>
        {t('product.selectWeight')}
      </Text>

      {/* Custom weight preset buttons */}
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
              {formatWeightDisplay(preset.grams)}
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
              {formatWeightDisplay(accumulatedGrams)}
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

      <View style={styles.footer}>
        <PriceText paise={customWeightPrice} variant="headlineSmall" />
        <View style={styles.addBtn}>
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            disabled={isAddDisabled}
            loading={isAdding}
            onPress={handleAdd}
          >
            {t('product.addToCart')}
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  addBtn: {
    flex: 1,
  },
});
