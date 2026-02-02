import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, Dimensions, FlatList, TextInput } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { FioriBottomSheet } from './FioriBottomSheet';
import { AppButton } from './AppButton';
import { StepperControl } from './StepperControl';
import { PriceText } from './PriceText';
import { formatPrice, getPerKgPaise } from '../../constants';
import { spacing, borderRadius, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';
import { hapticLight } from '../../utils/haptics';
import { useGetProductsQuery } from '../../store/apiSlice';
import type { Product } from '../../types';
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

export interface AddOrderItemResult {
  product_id: string;
  product_name: string;
  product_name_gu: string;
  weight_grams: number;
  quantity: number;
  unit_price_paise: number;
}

interface AddOrderItemSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onAdd: (item: AddOrderItemResult) => void;
}

export function AddOrderItemSheet({ visible, onDismiss, onAdd }: AddOrderItemSheetProps) {
  const { t, i18n } = useTranslation();
  const { appColors } = useAppTheme();
  const isGujarati = i18n.language === 'gu';

  const { data: products = [] } = useGetProductsQuery({ includeUnavailable: false });

  const [step, setStep] = useState<'pick' | 'configure'>('pick');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [weightGrams, setWeightGrams] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (visible) {
      setStep('pick');
      setSelectedProduct(null);
      setSearchQuery('');
      setWeightGrams(0);
      setQuantity(1);
    }
  }, [visible]);

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setWeightGrams(0);
    setQuantity(1);
    setStep('configure');
  }, []);

  const handleBack = useCallback(() => {
    setStep('pick');
    setSelectedProduct(null);
  }, []);

  const handleAdd = useCallback(() => {
    if (!selectedProduct || weightGrams === 0) return;
    const perKgPaise = getPerKgPaise(selectedProduct);
    const unitPrice = Math.round(perKgPaise * weightGrams / 1000);
    onAdd({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_name_gu: selectedProduct.name_gu,
      weight_grams: weightGrams,
      quantity,
      unit_price_paise: unitPrice,
    });
    onDismiss();
  }, [onAdd, onDismiss, selectedProduct, weightGrams, quantity]);

  const handleAddWeight = useCallback((grams: number) => {
    hapticLight();
    setWeightGrams((prev) => prev + grams);
  }, []);

  const handleResetWeight = useCallback(() => {
    hapticLight();
    setWeightGrams(0);
  }, []);

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.name_gu.includes(searchQuery);
  });

  const sheetTitle = step === 'pick' ? t('admin.addItem') : t('product.selectWeight');

  const renderProductPicker = () => (
    <>
      <TextInput
        style={[styles.searchInput, { borderColor: appColors.border, color: appColors.text.primary }]}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('common.search')}
        placeholderTextColor={appColors.text.secondary}
      />
      <FlatList
        data={filteredProducts}
        keyExtractor={(p) => p.id}
        style={styles.productList}
        renderItem={({ item: product }) => {
          const perKg = getPerKgPaise(product);
          return (
            <Pressable style={[styles.productRow, { borderBottomColor: appColors.border }]} onPress={() => handleSelectProduct(product)}>
              <View style={styles.productInfo}>
                <Text variant="bodyMedium" style={[styles.productRowName, { color: appColors.text.primary }]}>
                  {isGujarati ? product.name_gu : product.name}
                </Text>
                <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>
                  {formatPrice(perKg)}{t('product.perKg')}
                </Text>
              </View>
              <IconButton icon="chevron-right" size={20} iconColor={appColors.text.secondary} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text variant="bodyMedium" style={[styles.emptyText, { color: appColors.text.secondary }]}>{t('common.noResults')}</Text>
        }
      />
    </>
  );

  const renderConfigure = () => {
    if (!selectedProduct) return null;
    const perKgPaise = getPerKgPaise(selectedProduct);
    const computedPrice = Math.round(perKgPaise * weightGrams / 1000 * quantity);

    return (
      <>
        <Pressable style={styles.backRow} onPress={handleBack}>
          <IconButton icon="arrow-left" size={20} iconColor={appColors.text.secondary} />
          <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{t('common.back')}</Text>
        </Pressable>

        <Text variant="titleMedium" style={[styles.productName, { color: appColors.text.primary }]}>
          {isGujarati ? selectedProduct.name_gu : selectedProduct.name}
        </Text>
        <Text variant="bodySmall" style={[styles.perKgLabel, { color: appColors.text.secondary }]}>
          {formatPrice(perKgPaise)}{t('product.perKg')}
        </Text>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.primary }]}>
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
          <Text variant="headlineMedium" style={[styles.weightValue, { color: appColors.text.primary }]}>
            {weightGrams > 0 ? formatWeight(weightGrams) : '0g'}
          </Text>
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
          <View style={styles.addBtn}>
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={weightGrams === 0}
              onPress={handleAdd}
            >
              {t('admin.addItem')}
            </AppButton>
          </View>
        </View>
      </>
    );
  };

  return (
    <FioriBottomSheet visible={visible} onDismiss={onDismiss} title={sheetTitle}>
      {step === 'pick' ? renderProductPicker() : renderConfigure()}
    </FioriBottomSheet>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  productList: {
    maxHeight: SCREEN_HEIGHT * 0.45,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  productInfo: {
    flex: 1,
  },
  productRowName: {
    fontFamily: fontFamily.regular,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginLeft: -spacing.sm,
  },
  productName: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  perKgLabel: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
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
