import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { FioriBottomSheet } from './FioriBottomSheet';
import { AppButton } from './AppButton';
import { StepperControl } from './StepperControl';
import { PriceText } from './PriceText';
import { formatPrice } from '../../constants';
import { spacing, borderRadius, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptics';
import { formatWeight } from '../../utils/formatters';
import { useAddToCartMutation } from '../../store/apiSlice';
import type { Product } from '../../types';

const DEFAULT_PRESET_WEIGHTS = [
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

  const formatWeightDisplay = useCallback((grams: number) => {
    return formatWeight(grams, { useGujarati: isGujarati, t });
  }, [t, isGujarati]);

  // Accumulative mode state
  const [accumulatedGrams, setAccumulatedGrams] = useState(0);
  // Single-select mode state
  const [selectedWeightGrams, setSelectedWeightGrams] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const allowMixedWeights = product?.allow_mixed_weights ?? true;

  // Derive weight presets from product config or use defaults
  const weightPresets = useMemo((): { grams: number; contextLabel?: string }[] => {
    const opts = product?.weight_options;
    if (opts && opts.length > 0) {
      return opts
        .filter((wo) => wo.is_available)
        .sort((a, b) => a.display_order - b.display_order)
        .map((wo) => ({
          grams: wo.weight_grams,
          contextLabel: isGujarati ? (wo.label_gu || wo.label || undefined) : (wo.label || undefined),
        }));
    }
    return DEFAULT_PRESET_WEIGHTS.map((p) => ({ grams: p.grams }));
  }, [product?.weight_options, isGujarati]);

  useEffect(() => {
    if (product) {
      setAccumulatedGrams(0);
      setSelectedWeightGrams(null);
      setQuantity(1);
    }
  }, [product]);

  const customWeightPrice = useMemo(() => {
    if (!product || accumulatedGrams === 0) return 0;
    return Math.round(product.price_per_kg_paise * accumulatedGrams / 1000);
  }, [product, accumulatedGrams]);

  const singleSelectPrice = useMemo(() => {
    if (!product || !selectedWeightGrams) return 0;
    return Math.round(product.price_per_kg_paise * selectedWeightGrams / 1000) * quantity;
  }, [product, selectedWeightGrams, quantity]);

  const getPresetPrice = useCallback((grams: number) => {
    if (!product) return 0;
    return Math.round(product.price_per_kg_paise * grams / 1000);
  }, [product]);

  const handleAddWeight = useCallback((grams: number) => {
    hapticLight();
    setAccumulatedGrams((prev) => Math.min(prev + grams, MAX_CUSTOM_WEIGHT_GRAMS));
  }, []);

  const handleSelectWeight = useCallback((grams: number) => {
    hapticLight();
    setSelectedWeightGrams(grams);
    setQuantity(1);
  }, []);

  const handleClearWeight = useCallback(() => {
    hapticLight();
    setAccumulatedGrams(0);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!product) return;

    if (allowMixedWeights) {
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
        setAccumulatedGrams(0);
        onDismiss();
        hapticSuccess();
      } catch {
        hapticError();
      }
    } else {
      if (!selectedWeightGrams) {
        hapticError();
        return;
      }
      try {
        await addToCart({
          p_product_id: product.id,
          p_weight_grams: selectedWeightGrams,
          p_quantity: quantity,
        }).unwrap();
        setSelectedWeightGrams(null);
        setQuantity(1);
        onDismiss();
        hapticSuccess();
      } catch {
        hapticError();
      }
    }
  }, [addToCart, product, accumulatedGrams, allowMixedWeights, selectedWeightGrams, quantity, onDismiss]);

  if (!product) return null;

  const productName = isGujarati ? product.name_gu : product.name;

  const isAddDisabled = allowMixedWeights
    ? (accumulatedGrams < 10 || isAdding)
    : (!selectedWeightGrams || isAdding);

  const displayPrice = allowMixedWeights ? customWeightPrice : singleSelectPrice;

  return (
    <FioriBottomSheet visible={!!product} onDismiss={onDismiss} title={productName}>
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.primary }]}>
        {t('product.selectWeight')}
      </Text>

      <View style={styles.weightOptions}>
        {allowMixedWeights ? (
          weightPresets.map((preset) => (
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
              <Text variant="titleSmall" style={[styles.weightOptionLabel, { color: appColors.brand }]}>
                {formatWeightDisplay(preset.grams)}
              </Text>
              {preset.contextLabel ? (
                <Text variant="labelSmall" style={[styles.weightContextLabel, { color: appColors.text.secondary }]}>
                  {preset.contextLabel}
                </Text>
              ) : null}
              <Text variant="bodySmall" style={{ color: appColors.brand }}>
                +{formatPrice(getPresetPrice(preset.grams), isGujarati)}
              </Text>
            </Pressable>
          ))
        ) : (
          weightPresets.map((preset) => {
            const isSelected = selectedWeightGrams === preset.grams;
            return (
              <Pressable
                key={preset.grams}
                onPress={() => handleSelectWeight(preset.grams)}
                style={[
                  styles.weightOption,
                  isSelected
                    ? { borderColor: appColors.brand, backgroundColor: appColors.brand }
                    : { borderColor: appColors.border, backgroundColor: appColors.fieldBackground },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.radioHeader}>
                  <Text
                    variant="titleSmall"
                    style={[styles.weightOptionLabel, { color: isSelected ? appColors.text.inverse : appColors.text.primary, marginBottom: 0 }]}
                  >
                    {formatWeightDisplay(preset.grams)}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check-circle" size={16} color={appColors.text.inverse} />
                  )}
                </View>
                {preset.contextLabel ? (
                  <Text variant="labelSmall" style={[styles.weightContextLabel, { color: isSelected ? appColors.text.inverse : appColors.text.secondary }]}>
                    {preset.contextLabel}
                  </Text>
                ) : null}
                <Text variant="bodySmall" style={{ color: isSelected ? appColors.text.inverse : appColors.brand }}>
                  {formatPrice(getPresetPrice(preset.grams), isGujarati)}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      {allowMixedWeights ? (
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
      ) : (
        selectedWeightGrams && (
          <View style={styles.quantityRow}>
            <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>
              {t('product.quantity')}:
            </Text>
            <StepperControl
              value={quantity}
              onValueChange={setQuantity}
              min={1}
              max={99}
              accessibilityLabel={t('product.quantity')}
            />
          </View>
        )
      )}

      <View style={styles.footer}>
        <PriceText paise={displayPrice} variant="headlineSmall" />
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
  weightContextLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  radioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
