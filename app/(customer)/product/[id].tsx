import { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Button, Chip, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import { formatPrice } from '../../../src/constants';
import { colors, spacing, borderRadius, fontSize } from '../../../src/constants/theme';
import { WeightOption } from '../../../src/types';
import type { AppTheme } from '../../../src/theme';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();

  const { data: products = [] } = useGetProductsQuery();
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const favorites = useAppSelector((state) => state.products.favorites);
  const isFavorite = favorites.includes(id!);

  const [selectedWeight, setSelectedWeight] = useState<WeightOption | null>(product?.weight_options[0] || null);
  const [quantity, setQuantity] = useState(1);
  const isGujarati = i18n.language === 'gu';

  const heartScale = useSharedValue(1);
  const cartBounce = useSharedValue(1);
  const heartAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));
  const cartAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: cartBounce.value }] }));

  const handleToggleFavorite = useCallback(() => {
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    dispatch(toggleFavorite(id!));
  }, [dispatch, id, heartScale]);

  const handleAddToCart = useCallback(() => {
    if (!selectedWeight || !product) return;
    cartBounce.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    dispatch(addToCart({ product, weightOption: selectedWeight, quantity }));
    router.back();
  }, [dispatch, product, selectedWeight, quantity, router, cartBounce]);

  if (!product) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        <MaterialCommunityIcons name="leaf" size={80} color={theme.colors.primary} />
        <Animated.View style={[styles.favoriteButton, heartAnimatedStyle]}>
          <IconButton
            icon={isFavorite ? 'heart' : 'heart-outline'}
            iconColor={isFavorite ? theme.colors.error : colors.text.secondary}
            size={28}
            mode="contained"
            containerColor={colors.background.primary}
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

        <Text variant="titleMedium" style={styles.sectionTitle}>{t('product.selectWeight')}</Text>
        <View style={styles.weightOptions}>
          {product.weight_options.map((option) => (
            <Chip key={option.id} selected={selectedWeight?.id === option.id} onPress={() => setSelectedWeight(option)} style={styles.weightChip} showSelectedOverlay>
              {option.weight_grams}g - {formatPrice(option.price_paise)}
            </Chip>
          ))}
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
      </View>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text variant="bodyLarge" style={styles.totalLabel}>{t('cart.total')}</Text>
          <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {selectedWeight ? formatPrice(selectedWeight.price_paise * quantity) : '-'}
          </Text>
        </View>
        <Animated.View style={cartAnimatedStyle}>
          <Button mode="contained" icon="cart" onPress={handleAddToCart} disabled={!product.is_available || !selectedWeight} style={styles.addButton} contentStyle={styles.addButtonContent} labelStyle={styles.addButtonLabel}>
            {product.is_available ? t('product.addToCart') : t('product.outOfStock')}
          </Button>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { height: 250, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  favoriteButton: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  content: { padding: spacing.md },
  name: { fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.sm },
  description: { color: colors.text.secondary, lineHeight: 20, marginBottom: spacing.md },
  sectionTitle: { fontWeight: '600', color: colors.text.primary, marginBottom: 12 },
  weightOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  weightChip: { minWidth: 100 },
  quantitySection: { marginBottom: spacing.lg },
  quantityControl: { flexDirection: 'row', alignItems: 'center' },
  quantityBadge: { backgroundColor: colors.secondary, borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minWidth: 32, alignItems: 'center' },
  quantityValue: { fontWeight: '600', color: colors.text.primary },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border.light },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  totalLabel: { color: colors.text.secondary },
  addButton: { borderRadius: borderRadius.md },
  addButtonContent: { paddingVertical: spacing.sm },
  addButtonLabel: { fontSize: fontSize.xl, fontWeight: '600' },
});
