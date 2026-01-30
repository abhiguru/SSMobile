import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
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
  useGetProductImagesQuery,
} from '../../../src/store/apiSlice';
import { getStoredTokens } from '../../../src/services/supabase';
import { formatPrice, getProductImageUrl, SUPABASE_ANON_KEY } from '../../../src/constants';
import { colors, spacing, borderRadius, elevation, fontFamily } from '../../../src/constants/theme';
import { AppButton } from '../../../src/components/common/AppButton';
import { ProductImageManager } from '../../../src/components/common/ProductImageManager';
import { useToast } from '../../../src/components/common/Toast';

const STEP_SIZE = 32;
const SCREEN_WIDTH = Dimensions.get('window').width;

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

  const { data: products = [] } = useGetProductsQuery({ includeUnavailable: true });
  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );
  const { data: productImages = [] } = useGetProductImagesQuery(productId || '', { skip: !productId });
  const [updateProduct, { isLoading: saving }] = useUpdateProductMutation();

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

  const handleSave = async () => {
    if (!product) return;
    const pricePaise = Math.round(parseFloat(priceRupees) * 100);
    try {
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
    } catch {
      showToast({ message: t('common.error'), type: 'error' });
    }
  };

  // Validation
  const step0Valid = name.trim().length > 0 && nameGu.trim().length > 0;
  const step1Valid = !isNaN(parseFloat(priceRupees)) && parseFloat(priceRupees) > 0;

  if (!product || !productId) return null;

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
            <ProductImageManager productId={productId} disabled={saving} onUploadingChange={handleUploadingChange} />
            <TextInput
              label={t('admin.nameEn')}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              outlineColor={colors.fieldBorder}
              activeOutlineColor={colors.brand}
            />
            <TextInput
              label={t('admin.nameGu')}
              value={nameGu}
              onChangeText={setNameGu}
              mode="outlined"
              style={styles.input}
              outlineColor={colors.fieldBorder}
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
              outlineColor={colors.fieldBorder}
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
              outlineColor={colors.fieldBorder}
              activeOutlineColor={colors.brand}
            />
            <TextInput
              label={t('admin.pricePerKg')}
              value={priceRupees}
              onChangeText={setPriceRupees}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              outlineColor={colors.fieldBorder}
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
              value={
                !isNaN(parseFloat(priceRupees))
                  ? formatPrice(Math.round(parseFloat(priceRupees) * 100))
                  : '—'
              }
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
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
              disabled={currentStep === 0 ? !step0Valid || imageUploading : !step1Valid}
              onPress={goNext}
            >
              {t('common.next')}
            </AppButton>
          ) : (
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              loading={saving}
              disabled={saving}
              onPress={handleSave}
            >
              {t('admin.saveChanges')}
            </AppButton>
          )}
        </View>
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
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

  // Card
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...elevation.level1,
  },
  input: {
    marginBottom: spacing.sm,
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
    marginBottom: spacing.md,
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

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomBtn: {
    flex: 1,
  },
});
