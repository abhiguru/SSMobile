import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
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
  useGetCategoriesQuery,
  useGetProductImagesQuery,
} from '../../../src/store/apiSlice';
import { getStoredTokens } from '../../../src/services/supabase';
import { formatPrice, getProductImageUrl, SUPABASE_ANON_KEY } from '../../../src/constants';
import { colors, spacing, borderRadius, elevation, fontFamily } from '../../../src/constants/theme';
import { AppButton } from '../../../src/components/common/AppButton';
import { Toolbar } from '../../../src/components/common/Toolbar';
import { ProductImageManager } from '../../../src/components/common/ProductImageManager';
import { useToast } from '../../../src/components/common/Toast';
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
  const { showToast } = useToast();
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

  useEffect(() => {
    if (product) {
      setName(product.name);
      setNameGu(product.name_gu);
      setDescription(product.description ?? '');
      setDescriptionGu(product.description_gu ?? '');
      setPriceRupees((product.price_per_kg_paise / 100).toFixed(2));
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
    try {
      if (isCreateMode) {
        const defaultCategoryId = categories[0]?.id;
        if (!defaultCategoryId) {
          showToast({ message: t('common.error'), type: 'error' });
          return;
        }
        await createProduct({
          name,
          name_gu: nameGu,
          description: description || undefined,
          description_gu: descriptionGu || undefined,
          price_per_kg_paise: pricePaise,
          category_id: defaultCategoryId,
        }).unwrap();
        showToast({ message: t('admin.productCreated'), type: 'success' });
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
          },
        }).unwrap();
        showToast({ message: t('admin.productUpdated'), type: 'success' });
        router.back();
      }
    } catch {
      showToast({ message: t('common.error'), type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!productId) return;
    setDeleteDialogVisible(false);
    try {
      await deactivateProduct(productId).unwrap();
      showToast({ message: t('admin.productDeleted'), type: 'success' });
      router.back();
    } catch {
      showToast({ message: t('common.error'), type: 'error' });
    }
  };

  // Validation
  const step0Valid = name.trim().length > 0 && nameGu.trim().length > 0;
  const step1Valid = !isNaN(parseFloat(priceRupees)) && parseFloat(priceRupees) > 0;

  if (!isCreateMode && !product) return null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step Indicator */}
        <View style={styles.stepContainer}>
          {STEPS.map((step, index) => {
            const isActive = index <= currentStep;
            const isCurrent = index === currentStep;
            const isCompleted = index < currentStep;
            const circleColor = isCurrent
              ? colors.brand
              : isCompleted
                ? colors.positive
                : colors.neutralLight;
            const iconColor = isActive ? colors.text.inverse : colors.neutral;
            return (
              <View key={index} style={styles.stepWrapper}>
                {index > 0 && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: isActive ? colors.positive : colors.neutralLight },
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
                  style={[styles.stepLabel, isActive && styles.stepLabelActive]}
                >
                  {t(step.labelKey)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Step 0: Identity */}
        {currentStep === 0 && (
          <View style={styles.card}>
            {isCreateMode ? (
              <View style={styles.imageNote}>
                <MaterialCommunityIcons name="image-off-outline" size={20} color={colors.neutral} />
                <Text variant="bodySmall" style={styles.imageNoteText}>{t('admin.saveFirstForImages')}</Text>
              </View>
            ) : (
              <ProductImageManager productId={productId!} disabled={saving} onUploadingChange={handleUploadingChange} />
            )}
            <TextInput
              label={t('admin.nameEn')}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.brand}
            />
            <TextInput
              label={t('admin.nameGu')}
              value={nameGu}
              onChangeText={setNameGu}
              mode="outlined"
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.brand}
            />
          </View>
        )}

        {/* Step 1: Details */}
        {currentStep === 1 && (
          <View style={styles.card}>
            <TextInput
              label={t('admin.descriptionEn')}
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.brand}
            />
            <TextInput
              label={t('admin.descriptionGu')}
              value={descriptionGu}
              onChangeText={setDescriptionGu}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.brand}
            />
            <TextInput
              label={t('admin.pricePerKg')}
              value={priceRupees}
              onChangeText={setPriceRupees}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.brand}
            />
          </View>
        )}

        {/* Step 2: Review */}
        {currentStep === 2 && (
          <View style={styles.card}>
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

            <ReviewRow label={t('admin.nameEn')} value={name} />
            <ReviewRow label={t('admin.nameGu')} value={nameGu} />
            <ReviewRow label={t('admin.descriptionEn')} value={description || '—'} />
            <ReviewRow label={t('admin.descriptionGu')} value={descriptionGu || '—'} />
            <ReviewRow
              label={t('admin.pricePerKg')}
              isLast
              value={
                !isNaN(parseFloat(priceRupees))
                  ? formatPrice(Math.round(parseFloat(priceRupees) * 100))
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
            <MaterialCommunityIcons name="delete-outline" size={18} color={colors.negative} />
            <Text style={styles.deleteBtnText}>{t('admin.deleteProduct')}</Text>
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
        <Text variant="bodyMedium" style={{ color: colors.text.secondary }}>
          {t('admin.deleteProductConfirm')}
        </Text>
      </FioriDialog>
    </View>
  );
}

function ReviewRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.reviewRow, !isLast && styles.reviewRowBorder]}>
      <Text variant="labelSmall" style={styles.reviewLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.reviewValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.shell,
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
    backgroundColor: colors.surface,
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
    color: colors.neutral,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.brand,
    fontFamily: fontFamily.semiBold,
  },

  // Card (Fiori: 12pt radius, 1px border, elevation 1)
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.level1,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
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
    borderBottomColor: colors.border,
  },
  reviewLabel: {
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  reviewValue: {
    color: colors.text.primary,
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
    color: colors.negative,
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
  },
  imageNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.shell,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  imageNoteText: {
    color: colors.neutral,
    marginLeft: spacing.sm,
    flex: 1,
  },
  bottomBtn: {
    flex: 1,
  },
});
