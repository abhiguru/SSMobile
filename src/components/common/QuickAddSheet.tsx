import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useToast } from './Toast';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptics';
import { useAddToCartMutation } from '../../store/apiSlice';
import type { Product, WeightOption } from '../../types';

function formatWeight(grams: number, label?: string): string {
  if (label) return label;
  if (grams >= 1000) {
    const kg = grams / 1000;
    return Number.isInteger(kg) ? `${kg} kg` : `${kg.toFixed(1)} kg`;
  }
  return `${grams}g`;
}

interface QuickAddSheetProps {
  product: Product | null;
  onDismiss: () => void;
}

export function QuickAddSheet({ product, onDismiss }: QuickAddSheetProps) {
  const { t, i18n } = useTranslation();
  const { appColors } = useAppTheme();
  const { showToast } = useToast();
  const isGujarati = i18n.language === 'gu';

  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();

  const [selectedWeightOption, setSelectedWeightOption] = useState<WeightOption | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Filter to available weight options, sorted by display_order
  const availableWeightOptions = useMemo(() => {
    if (!product?.weight_options) return [];
    return product.weight_options
      .filter((wo) => wo.is_available !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [product?.weight_options]);

  useEffect(() => {
    if (product && availableWeightOptions.length > 0) {
      setSelectedWeightOption(availableWeightOptions[0]);
      setQuantity(1);
    } else {
      setSelectedWeightOption(null);
      setQuantity(1);
    }
  }, [product, availableWeightOptions]);

  const handleAdd = useCallback(async () => {
    if (!product || !selectedWeightOption) return;

    try {
      await addToCart({
        p_product_id: product.id,
        p_weight_option_id: selectedWeightOption.id,
        p_quantity: quantity,
      }).unwrap();

      hapticSuccess();
      showToast({ message: t('product.addedToCart'), type: 'success' });
      onDismiss();
    } catch {
      hapticError();
      showToast({ message: t('common.error'), type: 'error' });
    }
  }, [addToCart, product, selectedWeightOption, quantity, showToast, t, onDismiss]);

  const handleSelectWeight = useCallback((option: WeightOption) => {
    hapticLight();
    setSelectedWeightOption(option);
  }, []);

  if (!product) return null;

  const productName = isGujarati ? product.name_gu : product.name;
  const computedPrice = selectedWeightOption ? selectedWeightOption.price_paise * quantity : 0;

  return (
    <FioriBottomSheet visible={!!product} onDismiss={onDismiss} title={productName}>
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.primary }]}>
        {t('product.selectWeight')}
      </Text>

      {availableWeightOptions.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: appColors.text.secondary, marginBottom: spacing.lg }}>
          {t('product.noWeightOptions')}
        </Text>
      ) : (
        <View style={styles.weightOptions}>
          {availableWeightOptions.map((option) => {
            const isSelected = selectedWeightOption?.id === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => handleSelectWeight(option)}
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
      )}

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
        <View style={styles.addBtn}>
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            disabled={!selectedWeightOption || isAdding}
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
  quantitySection: {
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
