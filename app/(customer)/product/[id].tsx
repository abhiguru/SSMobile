import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

import { useGetProductByIdQuery, useGetFavoritesQuery, useToggleFavoriteMutation, useGetProductImagesQuery, useAddToCartMutation } from '../../../src/store/apiSlice';
import { formatPrice, resolveImageSource, getProductImageUrl, toGujaratiNumerals } from '../../../src/constants';
import { spacing, borderRadius, fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme';
import { AppButton } from '../../../src/components/common/AppButton';
import { ImagePreviewModal, PreviewImage } from '../../../src/components/common/ImagePreviewModal';
import { StepperControl } from '../../../src/components/common/StepperControl';
import type { Product } from '../../../src/types';

import { hapticLight, hapticSuccess, hapticError } from '../../../src/utils/haptics';

// Default weight presets when no weight_options configured
const DEFAULT_WEIGHT_PRESETS = [
  { grams: 100, labelKey: 'product.weightSample' },
  { grams: 500, labelKey: 'product.weightWeekly' },
  { grams: 1000, labelKey: 'product.weightMonthly' },
];

const MAX_CUSTOM_WEIGHT_GRAMS = 25000; // 25kg max

function ProductDescription({ product, isGujarati, color }: { product: Product; isGujarati: boolean; color: string }) {
  const description = isGujarati
    ? (product.description_gu?.trim() || product.description?.trim())
    : (product.description?.trim() || product.description_gu?.trim());

  if (!description) return null;

  return (
    <Text variant="bodyMedium" style={[styles.description, { color }]}>
      {description}
    </Text>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { appColors, appGradients } = useAppTheme();

  // Use dedicated query instead of filtering all products (fixes N+1 pattern)
  const { data: product, isLoading: productLoading } = useGetProductByIdQuery(id!, { skip: !id });
  const { data: favorites = [] } = useGetFavoritesQuery();
  const [toggleFav, { isLoading: isTogglingFav }] = useToggleFavoriteMutation();
  const isFavorite = favorites.includes(id!);

  const { data: productImages = [] } = useGetProductImagesQuery(id!);
  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation();

  const [accumulatedGrams, setAccumulatedGrams] = useState(0);
  const [selectedWeightGrams, setSelectedWeightGrams] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const isGujarati = i18n.language === 'gu';
  const screenWidth = Dimensions.get('window').width;

  // Derive weight presets from product weight_options or use defaults
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
    return DEFAULT_WEIGHT_PRESETS.map((p) => ({ grams: p.grams, contextLabel: t(p.labelKey) }));
  }, [product?.weight_options, isGujarati, t]);

  const allowMixedWeights = product?.allow_mixed_weights ?? true;

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

  // Reset weight when product changes
  useEffect(() => {
    setAccumulatedGrams(0);
    setSelectedWeightGrams(null);
    setQuantity(1);
  }, [id]);

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

  const handleSelectWeight = useCallback((grams: number) => {
    hapticLight();
    setSelectedWeightGrams(grams);
    setQuantity(1);
  }, []);

  const handleClearWeight = useCallback(() => {
    hapticLight();
    setAccumulatedGrams(0);
  }, []);

  const heartScale = useSharedValue(1);
  const heartAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));

  const handleToggleFavorite = useCallback(() => {
    hapticLight();
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    toggleFav(id!);
  }, [toggleFav, id, heartScale]);

  const handleAddToCart = useCallback(async () => {
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
        hapticSuccess();
        router.back();
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
        hapticSuccess();
        router.back();
      } catch {
        hapticError();
      }
    }
  }, [addToCart, product, accumulatedGrams, allowMixedWeights, selectedWeightGrams, quantity]);

  // Determine if add button should be disabled
  const isAddDisabled = allowMixedWeights
    ? (accumulatedGrams < 10 || isAddingToCart || !product?.is_available)
    : (!selectedWeightGrams || isAddingToCart || !product?.is_available);

  // Price for single-select mode
  const singleSelectPrice = useMemo(() => {
    if (!product || !selectedWeightGrams) return 0;
    return Math.round(product.price_per_kg_paise * selectedWeightGrams / 1000) * quantity;
  }, [product, selectedWeightGrams, quantity]);

  const carouselImages = useMemo(() => {
    if (productImages.length > 0) {
      return productImages.map((img) => ({
        display: { uri: getProductImageUrl(img.storage_path, { width: 400, height: 400, quality: 75 }), cacheKey: `display-${img.id}` },
        full: { uri: getProductImageUrl(img.storage_path) },
      }));
    }
    if (!product) return [];
    const fallback = resolveImageSource(product.image_url, null, { width: 400, height: 400, quality: 75 });
    const fallbackFull = resolveImageSource(product.image_url);
    if (fallback && fallbackFull) {
      return [{ display: fallback, full: fallbackFull }];
    }
    return [];
  }, [productImages, product?.image_url]);

  const previewImages: PreviewImage[] = useMemo(
    () => carouselImages.map((img) => img.full),
    [carouselImages],
  );

  const handleCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / screenWidth);
    setActiveImageIndex(index);
  }, [screenWidth]);

  if (productLoading || !product) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={appColors.brand} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: appColors.surface }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          {carouselImages.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleCarouselScroll}
                scrollEventThrottle={16}
              >
                {carouselImages.map((img, index) => (
                  <Pressable
                    key={index}
                    onPress={() => {
                      setActiveImageIndex(index);
                      setPreviewVisible(true);
                    }}
                  >
                    <Image
                      source={img.display}
                      style={[styles.heroImage, { width: screenWidth }]}
                      contentFit="cover"
                      transition={200}
                      priority={index === 0 ? 'high' : 'low'}
                    />
                  </Pressable>
                ))}
              </ScrollView>
              {/* #35: Enhanced carousel dots with brand color */}
              {carouselImages.length > 1 && (
                <View style={styles.dotsContainer} pointerEvents="none">
                  {carouselImages.map((_, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.dot,
                        i === activeImageIndex && [styles.dotActive, { backgroundColor: appColors.brand }],
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <LinearGradient
              colors={appGradients.brand as unknown as [string, string]}
              style={styles.heroImage}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="leaf" size={80} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          )}
          <Animated.View style={[styles.favoriteButton, heartAnimatedStyle]}>
            <IconButton
              icon={isFavorite ? 'heart' : 'heart-outline'}
              iconColor={isFavorite ? appColors.negative : appColors.text.secondary}
              size={28}
              mode="contained"
              containerColor={appColors.surface}
              onPress={handleToggleFavorite}
              loading={isTogglingFav}
              disabled={isTogglingFav}
            />
          </Animated.View>
        </View>

        <View style={styles.content}>
          <Text variant="headlineSmall" style={[styles.name, { color: appColors.text.primary }]}>{isGujarati ? product.name_gu : product.name}</Text>
          <ProductDescription product={product} isGujarati={isGujarati} color={appColors.text.secondary} />

          <Text variant="titleMedium" style={[styles.sectionTitle, { color: appColors.text.secondary }]}>{t('product.selectWeight')}</Text>

          {/* Weight preset buttons — dynamic from product config or defaults */}
          <View style={styles.weightOptions}>
            {allowMixedWeights ? (
              /* Accumulative mode: tap to add weight */
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
                  accessibilityLabel={`${t('accessibility.addWeight')} ${formatWeight(preset.grams)}`}
                >
                  <Text
                    variant="titleSmall"
                    style={[styles.weightOptionLabel, { color: appColors.brand }]}
                  >
                    {formatWeight(preset.grams)}
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
              /* Single-select mode: pick one weight */
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
                    accessibilityLabel={`${formatWeight(preset.grams)}${isSelected ? ', selected' : ''}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.radioHeader}>
                      <Text
                        variant="titleSmall"
                        style={[styles.weightOptionLabel, { color: isSelected ? appColors.text.inverse : appColors.text.primary, marginBottom: 0 }]}
                      >
                        {formatWeight(preset.grams)}
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
            <>
              {/* Accumulative mode: Selected weight summary */}
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
                      <Pressable onPress={handleClearWeight} style={styles.clearButton}>
                        <Text variant="bodySmall" style={{ color: appColors.brand }}>
                          {t('product.resetWeight')}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
                {accumulatedGrams > 0 && accumulatedGrams < 10 && (
                  <Text variant="bodySmall" style={{ color: appColors.negative, marginTop: spacing.xs }}>
                    {t('product.minWeight')}
                  </Text>
                )}
              </View>

              <View style={styles.totalContainer}>
                <Text variant="bodyLarge" style={{ color: appColors.text.secondary }}>{t('cart.total')}</Text>
                <Text variant="headlineSmall" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>
                  {customWeightPrice > 0 ? formatPrice(customWeightPrice, isGujarati) : '-'}
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Single-select mode: quantity stepper + total */}
              {selectedWeightGrams && (
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
              )}

              <View style={styles.totalContainer}>
                <Text variant="bodyLarge" style={{ color: appColors.text.secondary }}>{t('cart.total')}</Text>
                <Text variant="headlineSmall" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>
                  {singleSelectPrice > 0 ? formatPrice(singleSelectPrice, isGujarati) : '-'}
                </Text>
              </View>
            </>
          )}
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            icon="cart"
            disabled={isAddDisabled}
            loading={isAddingToCart}
            onPress={handleAddToCart}
          >
            {product.is_available ? t('product.addToCart') : t('product.outOfStock')}
          </AppButton>
        </View>
      </ScrollView>
      {previewImages.length > 0 && (
        <ImagePreviewModal
          images={previewImages}
          visible={previewVisible}
          initialIndex={activeImageIndex}
          onClose={() => setPreviewVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { height: 300, position: 'relative' },
  heroImage: { width: '100%', height: 300, justifyContent: 'center', alignItems: 'center' },
  dotsContainer: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 9, height: 9, borderRadius: 4.5 },
  favoriteButton: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  content: { padding: spacing.lg },
  name: { fontFamily: fontFamily.bold, marginBottom: spacing.sm },
  description: { lineHeight: 20, marginBottom: spacing.md },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  weightOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
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
  // #28: Contextual label for weight preset
  weightContextLabel: {
    fontSize: 10,
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
    gap: spacing.sm,
  },
  accumulatedWeight: {
    fontFamily: fontFamily.semiBold,
  },
  clearButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  radioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
});
