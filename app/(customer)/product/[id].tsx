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

import { useAppDispatch } from '../../../src/store';
import { useGetProductsQuery, useGetFavoritesQuery, useToggleFavoriteMutation, useGetProductImagesQuery } from '../../../src/store/apiSlice';
import { addToCart } from '../../../src/store/slices/cartSlice';
import { formatPrice, getPerKgPaise, resolveImageSource, getProductImageUrl } from '../../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme';
import { AppButton } from '../../../src/components/common/AppButton';
import { StepperControl } from '../../../src/components/common/StepperControl';
import { ImagePreviewModal, PreviewImage } from '../../../src/components/common/ImagePreviewModal';

import { hapticLight, hapticSuccess } from '../../../src/utils/haptics';
function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return Number.isInteger(kg) ? `${kg} kg` : `${kg.toFixed(1)} kg`;
  }
  return `${grams}g`;
}

const WEIGHT_INCREMENTS = [
  { label: '+10g', grams: 10 },
  { label: '+100g', grams: 100 },
  { label: '+500g', grams: 500 },
  { label: '+1kg', grams: 1000 },
];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { appColors, appGradients } = useAppTheme();

  const { data: products = [] } = useGetProductsQuery();
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const { data: favorites = [] } = useGetFavoritesQuery();
  const [toggleFav] = useToggleFavoriteMutation();
  const isFavorite = favorites.includes(id!);

  const { data: productImages = [] } = useGetProductImagesQuery(id!);
  const [weightGrams, setWeightGrams] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const isGujarati = i18n.language === 'gu';
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    setWeightGrams(0);
    setQuantity(1);
  }, [id]);

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

  const handleAddWeight = useCallback((grams: number) => {
    hapticLight();
    setWeightGrams((prev) => prev + grams);
  }, []);

  const handleResetWeight = useCallback(() => {
    hapticLight();
    setWeightGrams(0);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (weightGrams === 0 || !product) return;
    hapticSuccess();
    dispatch(addToCart({ product, weightGrams, quantity }));
  }, [dispatch, product, weightGrams, quantity]);

  const perKgPaise = product ? getPerKgPaise(product) : 0;
  const computedPrice = Math.round(perKgPaise * weightGrams / 1000 * quantity);

  if (!product) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={appColors.brand} />
      </View>
    );
  }

  const carouselImages = useMemo(() => {
    if (productImages.length > 0) {
      return productImages.map((img) => ({
        display: { uri: getProductImageUrl(img.storage_path, { width: 400, height: 400, quality: 75 }), cacheKey: `display-${img.id}` },
        full: { uri: getProductImageUrl(img.storage_path) },
      }));
    }
    const fallback = resolveImageSource(product.image_url, null, { width: 400, height: 400, quality: 75 });
    const fallbackFull = resolveImageSource(product.image_url);
    if (fallback && fallbackFull) {
      return [{ display: fallback, full: fallbackFull }];
    }
    return [];
  }, [productImages, product.image_url]);

  const previewImages: PreviewImage[] = useMemo(
    () => carouselImages.map((img) => img.full),
    [carouselImages],
  );

  const handleCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / screenWidth);
    setActiveImageIndex(index);
  }, [screenWidth]);

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
              {carouselImages.length > 1 && (
                <View style={styles.dotsContainer} pointerEvents="none">
                  {carouselImages.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === activeImageIndex && styles.dotActive]}
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
            />
          </Animated.View>
        </View>

        <View style={styles.content}>
          <Text variant="headlineSmall" style={[styles.name, { color: appColors.text.primary }]}>{isGujarati ? product.name_gu : product.name}</Text>
          {product.description && (
            <Text variant="bodyMedium" style={[styles.description, { color: appColors.text.secondary }]}>
              {isGujarati ? product.description_gu : product.description}
            </Text>
          )}
          <Text variant="bodyMedium" style={[styles.perKgPrice, { color: appColors.text.secondary }]}>
            {formatPrice(getPerKgPaise(product))}{t('product.perKg')}
          </Text>

          <Text variant="titleMedium" style={[styles.sectionTitle, { color: appColors.text.secondary }]}>{t('product.selectWeight')}</Text>
          <View style={styles.weightAccumulator}>
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
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: appColors.text.secondary }]}>{t('product.quantity')}</Text>
            <StepperControl
              value={quantity}
              onValueChange={setQuantity}
              min={1}
              max={99}
            />
          </View>

          <View style={styles.totalContainer}>
            <Text variant="bodyLarge" style={{ color: appColors.text.secondary }}>{t('cart.total')}</Text>
            <Text variant="headlineSmall" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>
              {weightGrams > 0 ? formatPrice(computedPrice) : '-'}
            </Text>
          </View>
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            icon="cart"
            disabled={!product.is_available || weightGrams === 0}
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
  description: { lineHeight: 20, marginBottom: spacing.sm },
  perKgPrice: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  weightAccumulator: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  weightDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  weightValue: { fontFamily: fontFamily.bold },
  quantitySection: {},
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
});
