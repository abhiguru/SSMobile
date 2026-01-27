import { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Chip, Text, Button, Searchbar, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetProductsQuery, useGetCategoriesQuery } from '../../src/store/apiSlice';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { toggleFavorite } from '../../src/store/slices/productsSlice';
import { getPerKgPaise } from '../../src/constants';
import { colors, spacing, borderRadius, elevation, gradients, fontFamily } from '../../src/constants/theme';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { SkeletonBox, SkeletonText } from '../../src/components/common/SkeletonLoader';
import { hapticLight } from '../../src/utils/haptics';
import type { AppTheme } from '../../src/theme';

function SkeletonProductGrid() {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonBox width="100%" height={100} borderRadius={borderRadius.md} />
          <SkeletonText lines={2} style={{ marginTop: spacing.sm }} />
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const dispatch = useAppDispatch();

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useGetProductsQuery();

  const {
    data: categories = [],
    refetch: refetchCategories,
  } = useGetCategoriesQuery();

  const favorites = useAppSelector((state) => state.products.favorites);
  const isLoading = productsLoading;
  const error = productsError
    ? (typeof productsError === 'object' && 'data' in productsError
        ? String(productsError.data)
        : 'Failed to load products')
    : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isGujarati = i18n.language === 'gu';

  const filteredProducts = useMemo(() => {
    let result = products;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.name_gu && p.name_gu.toLowerCase().includes(query))
      );
    }
    if (selectedCategory) {
      result = result.filter((p) => p.category_id === selectedCategory);
    }
    return result;
  }, [products, searchQuery, selectedCategory]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchCategories()]);
    setRefreshing(false);
  }, [refetchProducts, refetchCategories]);

  const handleToggleFavorite = useCallback((productId: string) => {
    hapticLight();
    dispatch(toggleFavorite(productId));
  }, [dispatch]);

  const renderCategory = ({ item }: { item: typeof categories[0] }) => {
    const isSelected = selectedCategory === item.id;
    return (
      <AnimatedPressable
        onPress={() => setSelectedCategory(isSelected ? null : item.id)}
      >
        <Chip
          mode={isSelected ? 'flat' : 'outlined'}
          style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
          textStyle={[styles.categoryText, isSelected && styles.categoryTextSelected]}
        >
          {isGujarati ? item.name_gu : item.name}
        </Chip>
      </AnimatedPressable>
    );
  };

  const renderProduct = ({ item, index }: { item: typeof products[0]; index: number }) => {
    const isFav = favorites.includes(item.id);
    const hasImage = !!item.image_url;

    return (
      <Animated.View entering={FadeInUp.delay(index * 80).duration(400)}>
        <AnimatedPressable
          onPress={() => router.push(`/(customer)/product/${item.id}`)}
          style={[
            styles.productCard,
            index % 2 === 0 ? styles.productCardLeft : styles.productCardRight,
          ]}
        >
          <View style={styles.productImageWrapper}>
            {hasImage ? (
              <Image
                source={{ uri: item.image_url }}
                style={styles.productImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={gradients.brand as unknown as [string, string]}
                style={styles.productImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="leaf" size={40} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
            <AnimatedPressable
              onPress={() => handleToggleFavorite(item.id)}
              style={styles.favoriteBtn}
            >
              <MaterialCommunityIcons
                name={isFav ? 'heart' : 'heart-outline'}
                size={20}
                color={isFav ? colors.negative : colors.text.inverse}
              />
            </AnimatedPressable>
          </View>
          <View style={styles.productInfo}>
            <Text variant="titleSmall" numberOfLines={2} style={styles.productName}>
              {isGujarati ? item.name_gu : item.name}
            </Text>
            {getPerKgPaise(item) > 0 && (
              <Text variant="titleSmall" style={{ color: colors.brand, fontFamily: fontFamily.bold }}>
                ₹{(getPerKgPaise(item) / 100).toFixed(0)}/kg
              </Text>
            )}
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.searchBarContainer}>
          <SkeletonBox width="100%" height={48} borderRadius={borderRadius.md} />
        </View>
        <SkeletonProductGrid />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge" style={{ color: colors.negative, textAlign: 'center', marginBottom: spacing.md }}>
          {error}
        </Text>
        <Button
          mode="contained"
          onPress={() => {
            refetchProducts();
            refetchCategories();
          }}
        >
          {t('common.retry')}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder={t('home.searchProducts')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
      </View>
      <Text variant="titleMedium" style={styles.sectionTitle}>{t('home.categories')}</Text>
      <FlashList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>{t('home.popularProducts')}</Text>
      {searchQuery.trim() && filteredProducts.length === 0 ? (
        <View style={styles.noResults}>
          <MaterialCommunityIcons name="magnify-close" size={48} color={colors.neutral} />
          <Text variant="bodyLarge" style={styles.noResultsText}>{t('common.noResults')}</Text>
        </View>
      ) : (
        <FlashList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
  },
  searchBar: {
    borderRadius: borderRadius.md,
    ...elevation.level1,
  },
  searchInput: {
    fontSize: 14,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsText: {
    color: colors.neutral,
    marginTop: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: 12,
  },
  categoriesList: {
    paddingHorizontal: 12,
  },
  categoryChip: {
    marginHorizontal: spacing.xs,
  },
  categoryChipSelected: {
    backgroundColor: colors.brand,
  },
  categoryText: {
    fontSize: 14,
  },
  categoryTextSelected: {
    color: colors.text.inverse,
  },
  productsList: {
    paddingHorizontal: 12,
    paddingBottom: spacing.md,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.level2,
  },
  productCardLeft: {
    marginLeft: 12,
    marginRight: spacing.xs,
  },
  productCardRight: {
    marginLeft: spacing.xs,
    marginRight: 12,
  },
  productImageWrapper: {
    position: 'relative',
  },
  productImage: {
    height: 100,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: spacing.sm,
  },
  productName: {
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: spacing.md,
  },
  skeletonCard: {
    width: '46%',
    margin: '2%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    ...elevation.level1,
  },
});
