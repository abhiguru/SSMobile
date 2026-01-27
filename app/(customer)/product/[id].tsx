import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

import { useAppDispatch, useAppSelector } from '../../../src/store';
import { toggleFavorite } from '../../../src/store/slices/productsSlice';
import { useGetProductsQuery } from '../../../src/store/apiSlice';
import { addToCart } from '../../../src/store/slices/cartSlice';
import { formatPrice, getPerKgPaise } from '../../../src/constants';
import { colors, spacing, borderRadius, gradients, elevation, fontFamily } from '../../../src/constants/theme';
import { AppButton } from '../../../src/components/common/AppButton';
import { useToast } from '../../../src/components/common/Toast';
import { hapticLight, hapticSuccess } from '../../../src/utils/haptics';
import type { AppTheme } from '../../../src/theme';

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
  const theme = useTheme<AppTheme>();
  const { showToast } = useToast();

  const { data: products = [] } = useGetProductsQuery();
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const favorites = useAppSelector((state) => state.products.favorites);
  const isFavorite = favorites.includes(id!);

  const [weightGrams, setWeightGrams] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const isGujarati = i18n.language === 'gu';

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
    dispatch(toggleFavorite(id!));
  }, [dispatch, id, heartScale]);

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
    showToast({ message: t('product.addedToCart'), type: 'success' });
  }, [dispatch, product, weightGrams, quantity, showToast, t]);

  const perKgPaise = product ? getPerKgPaise(product) : 0;
  const computedPrice = Math.round(perKgPaise * weightGrams / 1000 * quantity);

  if (!product) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const hasImage = !!product.image_url;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          {hasImage ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <LinearGradient
              colors={gradients.brand as unknown as [string, string]}
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
              iconColor={isFavorite ? colors.negative : colors.text.secondary}
              size={28}
              mode="contained"
              containerColor={colors.surface}
              onPress={handleToggleFavorite}
            />
          </Animated.View>
        </View>

        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.name}>{isGujarati ? product.name_gu : product.name}</Text>
          {product.description && (
            <Text variant="bodyMedium" style={styles.description}>
              {isGujarati ? product.description_gu : product.description}
            </Text>
          )}
          <Text variant="bodyMedium" style={styles.perKgPrice}>
            {formatPrice(getPerKgPaise(product))}{t('product.perKg')}
          </Text>

          <Text variant="titleMedium" style={styles.sectionTitle}>{t('product.selectWeight')}</Text>
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
            <Text variant="headlineMedium" style={styles.weightValue}>
              {weightGrams > 0 ? formatWeight(weightGrams) : '0g'}
            </Text>
          </View>

          <View style={styles.quantitySection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('product.quantity')}</Text>
            <View style={styles.quantityControl}>
              <IconButton icon="minus" mode="contained-tonal" size={20} onPress={() => setQuantity(Math.max(1, quantity - 1))} />
              <View style={styles.quantityBadge}>
                <Text variant="titleLarge" style={styles.quantityValue}>{quantity}</Text>
              </View>
              <IconButton icon="plus" mode="contained-tonal" size={20} onPress={() => setQuantity(quantity + 1)} />
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text variant="bodyLarge" style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text variant="headlineSmall" style={{ color: colors.brand, fontFamily: fontFamily.bold }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { height: 300, position: 'relative' },
  heroImage: { width: '100%', height: 300, justifyContent: 'center', alignItems: 'center' },
  favoriteButton: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  content: { padding: spacing.lg },
  name: { fontFamily: fontFamily.bold, color: colors.text.primary, marginBottom: spacing.sm },
  description: { color: colors.text.secondary, lineHeight: 20, marginBottom: spacing.sm },
  perKgPrice: { color: colors.text.secondary, marginBottom: spacing.md },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  weightAccumulator: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  weightDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  weightValue: { fontFamily: fontFamily.bold, color: colors.text.primary },
  quantitySection: {},
  quantityControl: { flexDirection: 'row', alignItems: 'center' },
  quantityBadge: { backgroundColor: colors.informativeLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minWidth: 48, alignItems: 'center' },
  quantityValue: { fontFamily: fontFamily.semiBold, color: colors.text.primary },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  totalLabel: { color: colors.text.secondary },
});
