import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text, TextInput, Switch } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useGetProductsQuery,
  useUpdateProductMutation,
  useCreateProductMutation,
  useDeactivateProductMutation,
  useSaveWeightOptionsMutation,
  useGetCategoriesQuery,
  useGetProductImagesQuery,
} from '../../../src/store/apiSlice';
import { getStoredTokens } from '../../../src/services/supabase';
import { formatPrice, getProductImageUrl, SUPABASE_ANON_KEY } from '../../../src/constants';
import { formatWeight } from '../../../src/utils/formatters';
import { FioriChip } from '../../../src/components/common/FioriChip';
import { spacing, borderRadius, elevation, fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme/useAppTheme';
import { AppButton } from '../../../src/components/common/AppButton';
import { Toolbar } from '../../../src/components/common/Toolbar';
import { ProductImageManager } from '../../../src/components/common/ProductImageManager';
import { FioriDialog } from '../../../src/components/common/FioriDialog';

const STEP_SIZE = 32;

const STEPS = [
  { labelKey: 'admin.step_identity', icon: 'tag-outline' as const },
  { labelKey: 'admin.step_details', icon: 'text-box-outline' as const },
  { labelKey: 'admin.step_review', icon: 'check-circle-outline' as const },
];

export default function EditProductScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { appColors } = useAppTheme();
  const isGujarati = i18n.language === 'gu';
  const { productId } = useLocalSearchParams<{ productId: string }>();

  const isCreateMode = !productId;

  const { data: products = [] } = useGetProductsQuery({ includeUnavailable: true });
  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );
  const { data: categories = [] } = useGetCategoriesQuery(undefined, { skip: !isCreateMode });
  const { data: productImages = [] } = useGetProductImagesQuery(productId || '', { skip: !productId });
  const [updateProduct, { isLoading: saving }] = useUpdateProductMutation();
  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [deactivateProduct, { isLoading: deactivating }] = useDeactivateProductMutation();
  const [saveWeightOptions] = useSaveWeightOptionsMutation();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [nameGu, setNameGu] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionGu, setDescriptionGu] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const handleUploadingChange = useCallback((v: boolean) => setImageUploading(v), []);

  // Weight options state
  const WEIGHT_PRESETS = [50, 100, 200, 500, 1000];
  const [selectedWeights, setSelectedWeights] = useState<number[]>([]);
  const [customWeights, setCustomWeights] = useState<number[]>([]);
  const [customWeightInput, setCustomWeightInput] = useState('');
  const [allowMixedWeights, setAllowMixedWeights] = useState(true);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setNameGu(product.name_gu);
      setDescription(product.description ?? '');
      setDescriptionGu(product.description_gu ?? '');
      setPriceRupees((product.price_per_kg_paise / 100).toFixed(2));

      setAllowMixedWeights(product.allow_mixed_weights ?? true);

      // Initialize weight options from product data
      const presets: number[] = [];
      const custom: number[] = [];
      if (product.weight_options && product.weight_options.length > 0) {
        for (const wo of product.weight_options) {
          if (WEIGHT_PRESETS.includes(wo.weight_grams)) {
            presets.push(wo.weight_grams);
          } else {
            custom.push(wo.weight_grams);
          }
        }
      }
      setSelectedWeights(presets);
      setCustomWeights(custom.sort((a, b) => a - b));
    }
  }, [product]);

  useEffect(() => {
    getStoredTokens().then(({ accessToken: token }) => setAccessToken(token));
  }, []);

  // Step indicator animations
  const s0 = useSharedValue(1);
  const s1 = useSharedValue(1);
  const s2 = useSharedValue(1);
  const stepScales = [s0, s1, s2];
  const sa0 = useAnimatedStyle(() => ({ transform: [{ scale: s0.value }] }));
  const sa1 = useAnimatedStyle(() => ({ transform: [{ scale: s1.value }] }));
  const sa2 = useAnimatedStyle(() => ({ transform: [{ scale: s2.value }] }));
  const stepAnimStyles = [sa0, sa1, sa2];

  const animateStep = (step: number) => {
    stepScales[step].value = withSpring(1.2, { damping: 8, stiffness: 400 });
    setTimeout(() => {
      stepScales[step].value = withSpring(1, { damping: 10, stiffness: 300 });
    }, 200);
  };

  const goNext = () => {
    const next = Math.min(currentStep + 1, 2);
    setCurrentStep(next);
    animateStep(next);
  };

  const goBack = () => {
    if (currentStep === 0) {
      router.back();
    } else {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      animateStep(prev);
    }
  };

  const isBusy = saving || creating || deactivating;

  const handleSave = async () => {
    const pricePaise = Math.round(parseFloat(priceRupees) * 100);
    const weightOpts = [...selectedWeights, ...customWeights]
      .sort((a, b) => a - b)
      .map((grams, i) => ({
        weight_grams: grams,
        display_order: i,
        is_available: true,
      }));

    try {
      if (isCreateMode) {
        const defaultCategoryId = categories[0]?.id;
        if (!defaultCategoryId) {
          return;
        }
        const newProduct = await createProduct({
          name,
          name_gu: nameGu,
          description: description || undefined,
          description_gu: descriptionGu || undefined,
          price_per_kg_paise: pricePaise,
          category_id: defaultCategoryId,
          allow_mixed_weights: allowMixedWeights,
        }).unwrap();
        if (weightOpts.length > 0) {
          await saveWeightOptions({ productId: newProduct.id, weightOptions: weightOpts }).unwrap();
        }
        router.back();
      } else {
        if (!product) return;
        await updateProduct({
          productId: product.id,
          updates: {
            name,
            name_gu: nameGu,
            description: description || undefined,
            description_gu: descriptionGu || undefined,
            price_per_kg_paise: isNaN(pricePaise) ? product.price_per_kg_paise : pricePaise,
            allow_mixed_weights: allowMixedWeights,
          },
        }).unwrap();
        await saveWeightOptions({ productId: product.id, weightOptions: weightOpts }).unwrap();
        router.back();
      }
    } catch {
      // Error handling without toast
    }
  };

  const handleDelete = async () => {
    if (!productId) return;
    setDeleteDialogVisible(false);
    try {
      await deactivateProduct(productId).unwrap();
      router.back();
    } catch {
      // Error handling without toast
    }
  };

  // Validation
  const step0Valid = name.trim().length > 0 && nameGu.trim().length > 0;
  const allWeights = [...selectedWeights, ...customWeights];
  const step1Valid = !isNaN(parseFloat(priceRupees)) && parseFloat(priceRupees) > 0 && allWeights.length > 0;

  if (!isCreateMode && !product) return null;

  return (
    <View style={[styles.root, { backgroundColor: appColors.shell }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step Indicator */}
        <View style={[styles.stepContainer, { backgroundColor: appColors.surface }]}>
          {STEPS.map((step, index) => {
            const isActive = index <= currentStep;
            const isCurrent = index === currentStep;
            const isCompleted = index < currentStep;
            const circleColor = isCurrent
              ? appColors.brand
              : isCompleted
                ? appColors.positive
                : appColors.neutralLight;
            const iconColor = isActive ? appColors.text.inverse : appColors.neutral;
            return (
              <View key={index} style={styles.stepWrapper}>
                {index > 0 && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: isActive ? appColors.positive : appColors.neutralLight },
                    ]}
                  />
                )}
                <Animated.View
                  style={[
                    styles.stepCircle,
                    { backgroundColor: circleColor },
                    stepAnimStyles[index],
                  ]}
                >
                  {isCompleted ? (
                    <MaterialCommunityIcons name="check" size={16} color={iconColor} />
                  ) : (
                    <MaterialCommunityIcons name={step.icon} size={16} color={iconColor} />
                  )}
                </Animated.View>
                <Text
                  variant="labelSmall"
                  style={[styles.stepLabel, { color: appColors.neutral }, isActive && { color: appColors.brand, fontFamily: fontFamily.semiBold }]}
                >
                  {t(step.labelKey)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Step 0: Identity */}
        {currentStep === 0 && (
          <View style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
            {isCreateMode ? (
              <View style={[styles.imageNote, { backgroundColor: appColors.shell }]}>
                <MaterialCommunityIcons name="image-off-outline" size={20} color={appColors.neutral} />
                <Text variant="bodySmall" style={[styles.imageNoteText, { color: appColors.neutral }]}>{t('admin.saveFirstForImages')}</Text>
              </View>
            ) : (
              <ProductImageManager productId={productId!} disabled={saving} onUploadingChange={handleUploadingChange} />
            )}
            <TextInput
              label={t('admin.nameEn')}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={[styles.input, { backgroundColor: appColors.surface }]}
              outlineColor={appColors.border}
              activeOutlineColor={appColors.brand}
            />
            <TextInput
              label={t('admin.nameGu')}
              value={nameGu}
              onChangeText={setNameGu}
              mode="outlined"
              style={[styles.input, { backgroundColor: appColors.surface }]}
              outlineColor={appColors.border}
              activeOutlineColor={appColors.brand}
            />
          </View>
        )}

        {/* Step 1: Details */}
        {currentStep === 1 && (
          <View style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
            <TextInput
              label={t('admin.descriptionEn')}
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={[styles.input, { backgroundColor: appColors.surface }]}
              outlineColor={appColors.border}
              activeOutlineColor={appColors.brand}
            />
            <TextInput
              label={t('admin.descriptionGu')}
              value={descriptionGu}
              onChangeText={setDescriptionGu}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={[styles.input, { backgroundColor: appColors.surface }]}
              outlineColor={appColors.border}
              activeOutlineColor={appColors.brand}
            />
            <TextInput
              label={t('admin.pricePerKg')}
              value={priceRupees}
              onChangeText={setPriceRupees}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: appColors.surface }]}
              outlineColor={appColors.border}
              activeOutlineColor={appColors.brand}
            />

            {/* Weight Options */}
            <Text variant="labelLarge" style={[styles.weightSectionLabel, { color: appColors.text.primary }]}>
              {t('admin.weightOptionsLabel')}
            </Text>
            <View style={styles.weightChipsRow}>
              {WEIGHT_PRESETS.map((grams) => {
                const isSelected = selectedWeights.includes(grams);
                return (
                  <FioriChip
                    key={grams}
                    label={formatWeight(grams)}
                    selected={isSelected}
                    showCheckmark
                    onPress={() => {
                      setSelectedWeights((prev) =>
                        isSelected ? prev.filter((g) => g !== grams) : [...prev, grams]
                      );
                    }}
                  />
                );
              })}
            </View>

            {/* Custom weights */}
            <View style={styles.customWeightRow}>
              <TextInput
                label={t('admin.customWeightGrams')}
                value={customWeightInput}
                onChangeText={setCustomWeightInput}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.customWeightInput, { backgroundColor: appColors.surface }]}
                outlineColor={appColors.border}
                activeOutlineColor={appColors.brand}
              />
              <AppButton
                variant="outline"
                size="md"
                onPress={() => {
                  const grams = parseInt(customWeightInput, 10);
                  if (grams > 0 && !selectedWeights.includes(grams) && !customWeights.includes(grams)) {
                    setCustomWeights((prev) => [...prev, grams].sort((a, b) => a - b));
                    setCustomWeightInput('');
                  }
                }}
                disabled={!customWeightInput || parseInt(customWeightInput, 10) <= 0}
              >
                {t('admin.addWeight')}
              </AppButton>
            </View>
            {customWeights.length > 0 && (
              <View style={styles.weightChipsRow}>
                {customWeights.map((grams) => (
                  <FioriChip
                    key={grams}
                    label={formatWeight(grams)}
                    selected
                    showCheckmark={false}
                    onPress={() => setCustomWeights((prev) => prev.filter((g) => g !== grams))}
                  />
                ))}
              </View>
            )}
            {/* Allow Mixed Weights toggle */}
            <View style={styles.mixedWeightsRow}>
              <View style={styles.mixedWeightsText}>
                <Text variant="labelLarge" style={[styles.weightSectionLabel, { color: appColors.text.primary, marginBottom: 0 }]}>
                  {t('admin.allowMixedWeights')}
                </Text>
                <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>
                  {t('admin.allowMixedWeightsHint')}
                </Text>
              </View>
              <Switch
                value={allowMixedWeights}
                onValueChange={setAllowMixedWeights}
                color={appColors.brand}
              />
            </View>

            {allWeights.length === 0 && (
              <Text variant="bodySmall" style={{ color: appColors.negative, marginTop: spacing.xs }}>
                {t('admin.atLeastOneWeight')}
              </Text>
            )}
          </View>
        )}

        {/* Step 2: Review */}
        {currentStep === 2 && (
          <View style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
            {/* Image thumbnails */}
            {productImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImageScroll}>
                {productImages.map((img) => {
                  const source = accessToken
                    ? {
                        uri: getProductImageUrl(img.storage_path),
                        headers: {
                          'Authorization': `Bearer ${accessToken}`,
                          'apikey': SUPABASE_ANON_KEY,
                        },
                      }
                    : { uri: getProductImageUrl(img.storage_path) };
                  return (
                    <Image
                      key={img.id}
                      source={source}
                      style={styles.reviewThumb}
                      contentFit="cover"
                      transition={200}
                    />
                  );
                })}
              </ScrollView>
            )}

            <ReviewRow label={t('admin.nameEn')} value={name} appColors={appColors} />
            <ReviewRow label={t('admin.nameGu')} value={nameGu} appColors={appColors} />
            <ReviewRow label={t('admin.descriptionEn')} value={description || '—'} appColors={appColors} />
            <ReviewRow label={t('admin.descriptionGu')} value={descriptionGu || '—'} appColors={appColors} />
            <ReviewRow
              label={t('admin.pricePerKg')}
              appColors={appColors}
              value={
                !isNaN(parseFloat(priceRupees))
                  ? formatPrice(Math.round(parseFloat(priceRupees) * 100))
                  : '—'
              }
            />
            <ReviewRow
              label={t('admin.allowMixedWeights')}
              value={allowMixedWeights ? t('common.yes', 'Yes') : t('common.no', 'No')}
              appColors={appColors}
            />
            <ReviewRow
              label={t('admin.weightOptionsLabel')}
              isLast
              appColors={appColors}
              value={
                allWeights.length > 0
                  ? allWeights.sort((a, b) => a - b).map((g) => formatWeight(g)).join(', ')
                  : '—'
              }
            />
          </View>
        )}

        {/* Delete button — only in edit mode on review step */}
        {!isCreateMode && currentStep === 2 && (
          <Pressable
            style={styles.deleteBtn}
            disabled={isBusy}
            onPress={() => setDeleteDialogVisible(true)}
          >
            <MaterialCommunityIcons name="delete-outline" size={18} color={appColors.negative} />
            <Text style={[styles.deleteBtnText, { color: appColors.negative }]}>{t('admin.deleteProduct')}</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <Toolbar>
        <View style={styles.bottomBtn}>
          <AppButton variant="outline" size="lg" fullWidth onPress={goBack}>
            {currentStep === 0 ? t('common.cancel') : t('common.back')}
          </AppButton>
        </View>
        <View style={styles.bottomBtn}>
          {currentStep < 2 ? (
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={currentStep === 0 ? !step0Valid || (!isCreateMode && imageUploading) : !step1Valid}
              onPress={goNext}
            >
              {t('common.next')}
            </AppButton>
          ) : (
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              loading={isBusy}
              disabled={isBusy}
              onPress={handleSave}
            >
              {isCreateMode ? t('admin.createProduct') : t('admin.saveChanges')}
            </AppButton>
          )}
        </View>
      </Toolbar>

      <FioriDialog
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        title={t('admin.deleteProductConfirmTitle')}
        actions={[
          { label: t('common.cancel'), onPress: () => setDeleteDialogVisible(false), variant: 'text' },
          { label: t('admin.deleteProduct'), onPress: handleDelete, variant: 'danger' },
        ]}
      >
        <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>
          {t('admin.deleteProductConfirm')}
        </Text>
      </FioriDialog>
    </View>
  );
}

function ReviewRow({ label, value, isLast, appColors }: { label: string; value: string; isLast?: boolean; appColors: any }) {
  return (
    <View style={[styles.reviewRow, !isLast && [styles.reviewRowBorder, { borderBottomColor: appColors.border }]]}>
      <Text variant="labelSmall" style={[styles.reviewLabel, { color: appColors.text.secondary }]}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ color: appColors.text.primary }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },

  // Step Indicator
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    ...elevation.level2,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepCircle: {
    width: STEP_SIZE,
    height: STEP_SIZE,
    borderRadius: STEP_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: STEP_SIZE / 2,
    right: '50%',
    width: '100%',
    height: 3,
    zIndex: -1,
  },
  stepLabel: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Card (Fiori: 12pt radius, 1px border, elevation 1)
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...elevation.level1,
  },
  input: {
    marginBottom: spacing.md,
  },
  weightSectionLabel: {
    fontFamily: fontFamily.semiBold,
    marginBottom: spacing.sm,
  },
  weightChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  customWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  customWeightInput: {
    flex: 1,
  },
  mixedWeightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  mixedWeightsText: {
    flex: 1,
    marginRight: spacing.md,
  },

  // Review
  reviewImageScroll: {
    marginBottom: spacing.lg,
  },
  reviewThumb: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  reviewRow: {
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  reviewRowBorder: {
    borderBottomWidth: 1,
  },
  reviewLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  deleteBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
  },
  imageNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  imageNoteText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  bottomBtn: {
    flex: 1,
  },
});
