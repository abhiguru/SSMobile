import { useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useAppSelector, useAppDispatch } from '../../src/store';
import { useGetProductsQuery } from '../../src/store/apiSlice';
import { toggleFavorite } from '../../src/store/slices/productsSlice';
import { EmptyState } from '../../src/components/common/EmptyState';

import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { Product } from '../../src/types';
import { getPerKgPaise } from '../../src/constants';
import { colors, spacing, borderRadius, elevation, gradients, fontFamily } from '../../src/constants/theme';
import { hapticMedium } from '../../src/utils/haptics';
import type { AppTheme } from '../../src/theme';

export default function FavoritesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector((state) => state.products.favorites);
  const { data: products = [] } = useGetProductsQuery();

  const favorites = useMemo(
    () => products.filter((p) => favoriteIds.includes(p.id)),
    [products, favoriteIds]
  );
  const isGujarati = i18n.language === 'gu';

  const handleUnfavorite = useCallback((productId: string) => {
    hapticMedium();
    dispatch(toggleFavorite(productId));
  }, [dispatch]);

  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    const hasImage = !!item.image_url;

    return (
      <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
        <AnimatedPressable
          onPress={() => router.push(`/(customer)/product/${item.id}`)}
          style={styles.productCard}
        >
          <View style={styles.productImageContainer}>
            {hasImage ? (
              <Image source={{ uri: item.image_url }} style={styles.productImage} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={gradients.brand as unknown as [string, string]}
                style={styles.productImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="leaf" size={32} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
            <View style={styles.heartOverlay}>
              <MaterialCommunityIcons name="heart" size={16} color={colors.negative} />
            </View>
          </View>
          <View style={styles.productInfo}>
            <Text variant="titleSmall" numberOfLines={2} style={styles.productName}>{isGujarati ? item.name_gu : item.name}</Text>
            {getPerKgPaise(item) > 0 && (
              <Text variant="titleSmall" style={{ color: colors.brand, fontFamily: fontFamily.bold }}>
                ₹{(getPerKgPaise(item) / 100).toFixed(0)}/kg
              </Text>
            )}
          </View>
          <AnimatedPressable
            onPress={() => handleUnfavorite(item.id)}
            style={styles.removeBtn}
          >
            <MaterialCommunityIcons name="heart-off" size={20} color={colors.negative} />
          </AnimatedPressable>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  if (favorites.length === 0) {
    return <EmptyState icon="heart-off" title={t('favorites.empty')} subtitle={t('favorites.addFavorites')} />;
  }

  return (
    <View style={styles.container}>
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
  container: { flex: 1, backgroundColor: colors.shell },
  listContent: { padding: spacing.lg },
  productCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginBottom: 12, overflow: 'hidden', alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...elevation.level2 },
  productImageContainer: { position: 'relative' },
  productImage: { width: 80, height: 80, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  heartOverlay: { position: 'absolute', top: spacing.xs, left: spacing.xs, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 12, justifyContent: 'center', paddingVertical: spacing.sm },
  productName: { fontFamily: fontFamily.regular, color: colors.text.primary, marginBottom: spacing.xs },
  removeBtn: { padding: spacing.md },
});
