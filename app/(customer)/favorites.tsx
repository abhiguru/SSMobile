import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetProductsQuery, useGetFavoritesQuery, useToggleFavoriteMutation } from '../../src/store/apiSlice';
import { SkeletonBox, SkeletonText } from '../../src/components/common/SkeletonLoader';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { QuickAddSheet } from '../../src/components/common/QuickAddSheet';
import { Product } from '../../src/types';
import { getPerKgPaise, resolveImageSource } from '../../src/constants';
import { getStoredTokens } from '../../src/services/supabase';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme';
import { hapticLight, hapticMedium } from '../../src/utils/haptics';

// #16: Skeleton loader for favorites
function FavoritesSkeleton() {
  const { appColors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <View style={styles.listContent}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.skeletonCard, { backgroundColor: appColors.surface }]}>
            <SkeletonBox width={80} height={80} borderRadius={borderRadius.lg} />
            <View style={styles.skeletonInfo}>
              <SkeletonText lines={2} width="70%" />
              <SkeletonBox width={60} height={20} borderRadius={borderRadius.sm} style={{ marginTop: spacing.sm }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function FavoritesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { appColors, appGradients } = useAppTheme();
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const favQuery = useGetFavoritesQuery();
  const { data: favoriteIds = [], isLoading: favoritesLoading, isFetching: favoritesFetching, refetch: refetchFavorites } = favQuery;
  const [toggleFav, { isLoading: isTogglingFav, originalArgs: togglingFavId }] = useToggleFavoriteMutation();
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useGetProductsQuery();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => { getStoredTokens().then(({ accessToken: t }) => setAccessToken(t)); }, []);

  console.log('[Favorites:Screen] render — status:', favQuery.status,
    'favoriteIds:', favoriteIds, 'products:', products.length);

  const favorites = useMemo(
    () => {
      const result = products.filter((p) => favoriteIds.includes(p.id));
      console.log('[Favorites:Screen] computed favorites list:', result.length,
        'ids:', result.map(p => p.id));
      return result;
    },
    [products, favoriteIds]
  );
  const isGujarati = i18n.language === 'gu';

  const handleUnfavorite = useCallback((productId: string) => {
    hapticMedium();
    toggleFav(productId);
  }, [toggleFav]);

  // #26 & #44: Pull-to-refresh handler with haptic feedback
  const handleRefresh = useCallback(async () => {
    hapticLight();
    await Promise.all([refetchFavorites(), refetchProducts()]);
  }, [refetchFavorites, refetchProducts]);

  // Show loading skeleton on initial load
  if ((favoritesLoading || productsLoading) && favorites.length === 0) {
    return <FavoritesSkeleton />;
  }

  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    const imgSource = resolveImageSource(item.image_url, accessToken);

    return (
      <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
        <AnimatedPressable
          onPress={() => router.push(`/(customer)/product/${item.id}`)}
          style={[styles.productCard, { backgroundColor: appColors.surface, borderColor: appColors.border }, elevation.level2]}
        >
          <View style={styles.productImageContainer}>
            {imgSource ? (
              <Image source={imgSource} style={styles.productImage} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={appGradients.brand as unknown as [string, string]}
                style={styles.productImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="leaf" size={32} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
            <View style={styles.heartOverlay}>
              <MaterialCommunityIcons name="heart" size={16} color={appColors.negative} />
            </View>
          </View>
          <View style={styles.productInfo}>
            <Text variant="titleSmall" numberOfLines={2} style={[styles.productName, { color: appColors.text.primary }]}>{isGujarati ? item.name_gu : item.name}</Text>
            {getPerKgPaise(item) > 0 && (
              <Text variant="titleSmall" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>
                ₹{(getPerKgPaise(item) / 100).toFixed(0)}/kg
              </Text>
            )}
          </View>
          <View style={styles.actionButtons}>
            <AnimatedPressable
              onPress={() => {
                hapticLight();
                setQuickAddProduct(item);
              }}
              style={styles.actionBtn}
            >
              <MaterialCommunityIcons name="cart-plus" size={22} color={appColors.brand} />
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => handleUnfavorite(item.id)}
              style={styles.actionBtn}
              disabled={isTogglingFav && togglingFavId === item.id}
            >
              {isTogglingFav && togglingFavId === item.id ? (
                <ActivityIndicator size={18} color={appColors.negative} />
              ) : (
                <MaterialCommunityIcons name="heart-off" size={20} color={appColors.negative} />
              )}
            </AnimatedPressable>
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  // #19: Empty favorites with action button
  if (favorites.length === 0) {
    return (
      <EmptyState
        icon="heart-off"
        title={t('favorites.empty')}
        subtitle={t('favorites.addFavorites')}
        actionLabel={t('favorites.browseProducts')}
        onAction={() => router.push('/(customer)')}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      {/* #26: Pull-to-refresh */}
      <FlashList
        data={favorites}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={favoritesFetching && !favoritesLoading}
            onRefresh={handleRefresh}
            tintColor={appColors.brand}
          />
        }
      />
      <QuickAddSheet
        product={quickAddProduct}
        onDismiss={() => setQuickAddProduct(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: spacing.lg },
  productCard: { flexDirection: 'row', borderRadius: borderRadius.lg, marginBottom: 12, overflow: 'hidden', alignItems: 'center', borderWidth: 1 },
  productImageContainer: { position: 'relative' },
  productImage: { width: 80, height: 80, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  heartOverlay: { position: 'absolute', top: spacing.xs, left: spacing.xs, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 12, justifyContent: 'center', paddingVertical: spacing.sm },
  productName: { fontFamily: fontFamily.regular, marginBottom: spacing.xs },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: spacing.sm },
  // #16: Skeleton styles
  skeletonCard: { flexDirection: 'row', borderRadius: borderRadius.lg, marginBottom: 12, padding: spacing.sm },
  skeletonInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
});
