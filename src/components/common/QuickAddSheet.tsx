import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Portal, Text, IconButton, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from './AppButton';
import { PriceText } from './PriceText';
import { formatPrice, getPerKgPaise } from '../../constants';
import { colors, spacing, borderRadius, elevation } from '../../constants/theme';
import { hapticLight } from '../../utils/haptics';
import type { Product } from '../../types';
import type { AppTheme } from '../../theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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

interface QuickAddSheetProps {
  product: Product | null;
  onDismiss: () => void;
  onAdd: (product: Product, weightGrams: number, quantity: number) => void;
}

export function QuickAddSheet({ product, onDismiss, onAdd }: QuickAddSheetProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const isGujarati = i18n.language === 'gu';

  const [weightGrams, setWeightGrams] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (product) {
      setWeightGrams(0);
      setQuantity(1);
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    }
  }, [product, translateY]);

  const handleDismiss = useCallback(() => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(onDismiss)();
    });
  }, [translateY, onDismiss]);

  const handleAdd = useCallback(() => {
    if (!product || weightGrams === 0) return;
    onAdd(product, weightGrams, quantity);
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(onDismiss)();
    });
  }, [translateY, onAdd, onDismiss, product, weightGrams, quantity]);

  const handleAddWeight = useCallback((grams: number) => {
    hapticLight();
    setWeightGrams((prev) => prev + grams);
  }, []);

  const handleResetWeight = useCallback(() => {
    hapticLight();
    setWeightGrams(0);
  }, []);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!product) return null;

  const perKgPaise = getPerKgPaise(product);
  const computedPrice = Math.round(perKgPaise * weightGrams / 1000 * quantity);

  return (
    <Portal>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleDismiss} />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, sheetStyle]}>
          <View style={styles.handle} />

          <Text variant="titleMedium" style={styles.productName}>
            {isGujarati ? product.name_gu : product.name}
          </Text>
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
            <View style={styles.quantityControl}>
              <IconButton
                icon="minus"
                mode="contained-tonal"
                size={20}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              />
              <View style={styles.quantityBadge}>
                <Text variant="titleLarge" style={styles.quantityValue}>{quantity}</Text>
              </View>
              <IconButton
                icon="plus"
                mode="contained-tonal"
                size={20}
                onPress={() => setQuantity(quantity + 1)}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <PriceText paise={computedPrice} variant="headlineSmall" />
            <View style={styles.addBtn}>
              <AppButton
                variant="primary"
                size="lg"
                fullWidth
                disabled={weightGrams === 0}
                onPress={handleAdd}
              >
                {t('product.addToCart')}
              </AppButton>
            </View>
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    ...elevation.level4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.fieldBorder,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  productName: {
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
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
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityBadge: {
    backgroundColor: colors.informativeLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  quantityValue: {
    fontWeight: '600',
    color: colors.text.primary,
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
