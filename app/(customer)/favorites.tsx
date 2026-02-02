import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetProductsQuery, useGetFavoritesQuery, useToggleFavoriteMutation } from '../../src/store/apiSlice';
import { EmptyState } from '../../src/components/common/EmptyState';

import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { Product } from '../../src/types';
import { getPerKgPaise, resolveImageSource } from '../../src/constants';
import { getStoredTokens } from '../../src/services/supabase';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme';
import { hapticMedium } from '../../src/utils/haptics';

export default function FavoritesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { appColors, appGradients } = useAppTheme();
  const favQuery = useGetFavoritesQuery();
  const { data: favoriteIds = [] } = favQuery;
  const [toggleFav] = useToggleFavoriteMutation();
  const { data: products = [] } = useGetProductsQuery();
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
          <AnimatedPressable
            onPress={() => handleUnfavorite(item.id)}
            style={styles.removeBtn}
          >
            <MaterialCommunityIcons name="heart-off" size={20} color={appColors.negative} />
          </AnimatedPressable>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  if (favorites.length === 0) {
    return <EmptyState icon="heart-off" title={t('favorites.empty')} subtitle={t('favorites.addFavorites')} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <FlashList
        data={favorites}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
  removeBtn: { padding: spacing.md },
});
