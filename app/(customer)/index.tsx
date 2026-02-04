import { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef, memo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  FlatList,
  PanResponder,
  AccessibilityInfo,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Badge, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import Animated, {
  FadeInUp, FadeInDown, FadeOutUp,
  useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { useGetProductsQuery, useGetCategoriesQuery, useGetFavoritesQuery, useToggleFavoriteMutation, useGetCartSummaryQuery } from '../../src/store/apiSlice';
import type { Product } from '../../src/types';
import { getPerKgPaise, resolveImageSource, toGujaratiNumerals } from '../../src/constants';
import { getStoredTokens } from '../../src/services/supabase';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { useAppTheme, useThemeMode } from '../../src/theme';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { SkeletonBox, SkeletonText } from '../../src/components/common/SkeletonLoader';
import { QuickAddSheet } from '../../src/components/common/QuickAddSheet';
import { FioriSearchBar } from '../../src/components/common/FioriSearchBar';
import { FioriChip } from '../../src/components/common/FioriChip';

import { AppButton } from '../../src/components/common/AppButton';
import { hapticLight } from '../../src/utils/haptics';

type ListItem =
  | { type: 'header'; letter: string }
  | { type: 'product'; product: Product };

const HEADER_HEIGHT = 28;
const ITEM_HEIGHT = 76; // card(64) + marginBottom(8) + border(2) + small rounding
const ALPHABET_EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ALPHABET_GU = 'અઆઇઈઉઊએઐઓઔકખગઘચછજઝટઠડઢણતથદધનપફબભમયરલવશષસહળ'.split('');

const FisheyeLetter = memo(({
  letter,
  index,
  activeIdx,
  hasProducts,
}: {
  letter: string;
  index: number;
  activeIdx: SharedValue<number>;
  hasProducts: boolean;
}) => {
  const { appColors } = useAppTheme();
  const animStyle = useAnimatedStyle(() => {
    if (activeIdx.value < 0) {
      return { transform: [{ scale: withTiming(1, { duration: 150 }) }] };
    }
    const dist = Math.abs(index - activeIdx.value);
    const scale = interpolate(dist, [0, 1, 2, 3], [1.6, 1.3, 1.1, 1], Extrapolation.CLAMP);
    return { transform: [{ scale }] };
  });

  return (
    <Animated.View style={[styles.alphabetLetterBtn, animStyle]} pointerEvents="none">
      <Animated.Text
        style={[
          styles.alphabetLetter,
          { color: appColors.brand },
          !hasProducts && { color: appColors.neutralLight },
        ]}
      >
        {letter}
      </Animated.Text>
    </Animated.View>
  );
});

function SkeletonProductGrid() {
  const { appColors } = useAppTheme();
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: appColors.surface }, elevation.level1]}>
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
  const { appColors } = useAppTheme();
  const { isDark } = useThemeMode();
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

  const { data: favorites = [] } = useGetFavoritesQuery();
  const [toggleFav, { isLoading: isTogglingFav, originalArgs: togglingFavId }] = useToggleFavoriteMutation();
  const { data: cartSummary } = useGetCartSummaryQuery();

  const cartCount = cartSummary?.item_count ?? 0;

  const isLoading = productsLoading;
  const error = productsError
    ? (typeof productsError === 'object' && 'data' in productsError
        ? String(productsError.data)
        : 'Failed to load products')
    : null;

  const navigation = useNavigation();

  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => { getStoredTokens().then(({ accessToken: t }) => setAccessToken(t)); }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const isGujarati = i18n.language === 'gu';
  const alphabet = isGujarati ? ALPHABET_GU : ALPHABET_EN;

  // #1: Search debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // #49: Reduce motion support
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove();
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={toggleSearch}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.toggleSearch')}
          >
            <MaterialCommunityIcons
              name={searchOpen ? 'close' : 'magnify'}
              size={24}
              color={appColors.text.primary}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(customer)/cart')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.goToCart')}
          >
            <MaterialCommunityIcons name="cart-outline" size={24} color={appColors.text.primary} />
            {cartCount > 0 && (
              <Badge
                size={16}
                style={[styles.cartBadge, { backgroundColor: appColors.negative, color: appColors.text.inverse }]}
              >
                {cartCount > 9 ? '9+' : cartCount}
              </Badge>
            )}
          </Pressable>
        </View>
      ),
    });
  }, [navigation, searchOpen, cartCount, router, toggleSearch, appColors]);

  const flatListRef = useRef<FlatList<ListItem>>(null);

  // #1 & #40: Use debounced search and search both name and name_gu (bilingual)
  const filteredProducts = useMemo(() => {
    let result = products;
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      // Search both English and Gujarati names for better discovery
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.name_gu && p.name_gu.toLowerCase().includes(query))
      );
    }
    if (selectedCategory) {
      result = result.filter((p) => p.category_id === selectedCategory);
    }
    const displayName = (p: Product) =>
      (isGujarati ? p.name_gu || p.name : p.name).toLowerCase();
    return [...result].sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }, [products, debouncedSearch, selectedCategory, isGujarati]);

  const sections = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    for (const p of filteredProducts) {
      const name = isGujarati ? p.name_gu || p.name : p.name;
      const letter = (name[0] || '#').toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(p);
    }
    return Object.keys(grouped)
      .sort()
      .map((letter) => ({ title: letter, data: grouped[letter] }));
  }, [filteredProducts, isGujarati]);

  const { flatData, stickyIndices, letterOffsets } = useMemo(() => {
    const flat: ListItem[] = [];
    const sticky: number[] = [];
    const offsets: Record<string, number> = {};
    let offset = 0;

    for (const section of sections) {
      offsets[section.title] = offset;
      sticky.push(flat.length);
      flat.push({ type: 'header', letter: section.title });
      offset += HEADER_HEIGHT;

      for (const p of section.data) {
        flat.push({ type: 'product', product: p });
        offset += ITEM_HEIGHT;
      }
    }

    return { flatData: flat, stickyIndices: sticky, letterOffsets: offsets };
  }, [sections]);

  const activeLetters = useMemo(
    () => new Set(sections.map((s) => s.title)),
    [sections],
  );

  const handleLetterPress = useCallback(
    (letter: string) => {
      const offset = letterOffsets[letter];
      if (offset !== undefined && flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset, animated: true });
      }
    },
    [letterOffsets],
  );

  const activeLetterIdx = useSharedValue(-1);
  const railHeight = useRef(0);
  const lastScrolledIdx = useRef(-1);

  // Filtered alphabet - only letters with products
  const visibleLetters = useMemo(() =>
    alphabet.filter(l => activeLetters.has(l)),
    [alphabet, activeLetters]
  );

  const railPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: (evt) => {
      const y = evt.nativeEvent.locationY;
      const h = railHeight.current;
      if (h === 0 || visibleLetters.length === 0) return;
      const len = visibleLetters.length;
      const idx = Math.min(len - 1, Math.max(0, Math.floor((y / h) * len)));
      const letter = visibleLetters[idx];
      activeLetterIdx.value = idx;
      lastScrolledIdx.current = idx;
      hapticLight();
      handleLetterPress(letter);
    },
    onPanResponderMove: (evt) => {
      const y = evt.nativeEvent.locationY;
      const h = railHeight.current;
      if (h === 0 || visibleLetters.length === 0) return;
      const len = visibleLetters.length;
      const idx = Math.min(len - 1, Math.max(0, Math.floor((y / h) * len)));
      activeLetterIdx.value = idx;
      if (idx !== lastScrolledIdx.current) {
        const letter = visibleLetters[idx];
        lastScrolledIdx.current = idx;
        hapticLight();
        handleLetterPress(letter);
      }
    },
    onPanResponderRelease: () => {
      activeLetterIdx.value = -1;
      lastScrolledIdx.current = -1;
    },
    onPanResponderTerminate: () => {
      activeLetterIdx.value = -1;
      lastScrolledIdx.current = -1;
    },
  }), [visibleLetters, handleLetterPress, activeLetterIdx]);

  const onRailLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    railHeight.current = e.nativeEvent.layout.height;
    console.log('[Rail] onLayout height=', e.nativeEvent.layout.height);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchCategories()]);
    setRefreshing(false);
  }, [refetchProducts, refetchCategories]);

  const handleToggleFavorite = useCallback((productId: string) => {
    hapticLight();
    toggleFav(productId);
  }, [toggleFav]);

  const renderCategory = useCallback(({ item }: { item: typeof categories[0] }) => {
    const isSelected = selectedCategory === item.id;
    return (
      <View style={styles.categoryChipWrapper}>
        <FioriChip
          label={isGujarati ? item.name_gu : item.name}
          selected={isSelected}
          onPress={() => setSelectedCategory(isSelected ? null : item.id)}
          showCheckmark
        />
      </View>
    );
  }, [selectedCategory, isGujarati]);

  const renderListItem = useCallback(({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === 'header') {
      return (
        // #45: Sticky header with subtle shadow effect
        <View style={[styles.sectionHeader, { backgroundColor: appColors.shell }]}>
          <Text style={[styles.sectionHeaderText, { color: appColors.text.secondary }]}>{item.letter}</Text>
        </View>
      );
    }

    const product = item.product;
    const isFav = favorites.includes(product.id);
    const imgSource = resolveImageSource(product.image_url, accessToken, { width: 128, height: 128, quality: 70 });
    const isUnavailable = !product.is_available;

    // #49: Skip animations if reduce motion is enabled
    const enteringAnimation = reduceMotion ? undefined : FadeInUp.delay(Math.min(index, 10) * 50).duration(400);

    return (
      <Animated.View entering={enteringAnimation}>
        <AnimatedPressable
          onPress={() => router.push(`/(customer)/product/${product.id}`)}
          style={[
            styles.productCard,
            { backgroundColor: appColors.surface, borderColor: appColors.border },
            elevation.level2,
            isUnavailable && { opacity: 0.6 },
          ]}
        >
          {/* #41: Product image with dark mode border */}
          <View style={[styles.productImageContainer, isDark && styles.productImageDarkMode]}>
            {imgSource ? (
              <Image
                source={imgSource}
                style={[styles.productImage, isDark && { borderColor: appColors.border, borderWidth: 1 }]}
                contentFit="cover"
                transition={reduceMotion ? 0 : 200}
              />
            ) : (
              <View style={[styles.productImage, styles.productImagePlaceholder, { backgroundColor: appColors.brandLight }]}>
                <MaterialCommunityIcons name="leaf" size={26} color={appColors.brand} />
              </View>
            )}
            {/* #14: Out of Stock overlay */}
            {isUnavailable && (
              <View style={[styles.outOfStockOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <Text style={styles.outOfStockText}>{t('product.outOfStock')}</Text>
              </View>
            )}
          </View>
          <View style={styles.productInfo}>
            <Text variant="titleSmall" numberOfLines={2} style={[styles.productName, { color: appColors.text.primary }]}>
              {isGujarati ? product.name_gu : product.name}
            </Text>
            {/* #18: Price prominence - larger font for price */}
            {getPerKgPaise(product) > 0 && (
              <Text variant="titleSmall" style={[styles.productPrice, { color: appColors.brand }]}>
                ₹{isGujarati ? toGujaratiNumerals((getPerKgPaise(product) / 100).toFixed(0)) : (getPerKgPaise(product) / 100).toFixed(0)}{t('product.perKg')}
              </Text>
            )}
          </View>
          <AnimatedPressable
            onPress={() => handleToggleFavorite(product.id)}
            style={styles.favoriteBtn}
            disabled={isTogglingFav && togglingFavId === product.id}
            accessibilityRole="button"
            accessibilityLabel={isFav ? t('accessibility.removeFavorite', { name: product.name }) : t('accessibility.addFavorite', { name: product.name })}
          >
            {isTogglingFav && togglingFavId === product.id ? (
              <ActivityIndicator size={18} color={appColors.neutral} />
            ) : (
              <MaterialCommunityIcons
                name={isFav ? 'heart' : 'heart-outline'}
                size={20}
                color={isFav ? appColors.negative : appColors.neutral}
              />
            )}
          </AnimatedPressable>
          <View style={[styles.actionDivider, { backgroundColor: appColors.border }]} />
          <AnimatedPressable
            onPress={() => {
              hapticLight();
              setQuickAddProduct(product);
            }}
            style={styles.quickAddBtn}
            disabled={isUnavailable}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.quickAdd', { name: product.name })}
          >
            <MaterialCommunityIcons name="cart-plus" size={22} color={isUnavailable ? appColors.neutral : appColors.brand} />
          </AnimatedPressable>
        </AnimatedPressable>
      </Animated.View>
    );
  }, [favorites, isGujarati, router, handleToggleFavorite, setQuickAddProduct, accessToken, appColors, isTogglingFav, togglingFavId, reduceMotion, isDark, t]);

  const getListItemKey = useCallback((item: ListItem) => {
    return item.type === 'header' ? `header-${item.letter}` : item.product.id;
  }, []);

  if (isLoading && products.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: appColors.shell }]}>
        <SkeletonProductGrid />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge" style={{ color: appColors.negative, textAlign: 'center', marginBottom: spacing.md }}>
          {error}
        </Text>
        <AppButton
          variant="primary"
          size="md"
          onPress={() => {
            refetchProducts();
            refetchCategories();
          }}
        >
          {t('common.retry')}
        </AppButton>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      {searchOpen && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutUp.duration(150)}
          style={[styles.searchBarContainer, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}
        >
          <FioriSearchBar
            placeholder={t('home.searchProducts')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            autoFocus
          />
        </Animated.View>
      )}
      <View style={styles.listArea}>
        <View style={styles.listColumn}>
          <FlashList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />

          {debouncedSearch.trim() && filteredProducts.length === 0 ? (
            <View style={styles.noResults}>
              <MaterialCommunityIcons name="magnify-close" size={48} color={appColors.neutral} />
              <Text variant="bodyLarge" style={[styles.noResultsText, { color: appColors.neutral }]}>{t('common.noResults')}</Text>
            </View>
          ) : (
            /* #42: Keyboard dismiss on scroll */
            <FlatList
              ref={flatListRef}
              data={flatData}
              renderItem={renderListItem}
              keyExtractor={getListItemKey}
              contentContainerStyle={styles.productsList}
              stickyHeaderIndices={stickyIndices}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              getItemLayout={(_, index) => {
                // Pre-calculate item positions for scroll performance
                // Headers use HEADER_HEIGHT, products use ITEM_HEIGHT
                const item = flatData[index];
                const length = item?.type === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT;
                // Calculate offset by summing heights of all previous items
                let offset = 0;
                for (let i = 0; i < index; i++) {
                  offset += flatData[i]?.type === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT;
                }
                return { length, offset, index };
              }}
            />
          )}
        </View>
        <View
          style={[styles.alphabetBar, { backgroundColor: appColors.shell }]}
          onLayout={onRailLayout}
          {...railPanResponder.panHandlers}
        >
          {visibleLetters.map((letter, i) => (
            <FisheyeLetter
              key={letter}
              letter={letter}
              index={i}
              activeIdx={activeLetterIdx}
              hasProducts={true}
            />
          ))}
        </View>
      </View>
      <QuickAddSheet
        product={quickAddProduct}
        onDismiss={() => setQuickAddProduct(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  headerBtn: {
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
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
    marginTop: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  categoriesList: {
    paddingHorizontal: 12,
    paddingTop: spacing.sm,
  },
  categoryChipWrapper: {
    marginHorizontal: spacing.xs,
  },
  listArea: {
    flex: 1,
    flexDirection: 'row',
  },
  listColumn: {
    flex: 1,
  },
  alphabetBar: {
    width: 32,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  alphabetLetterBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  alphabetLetter: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
  },
  productsList: {
    paddingBottom: spacing.md,
  },
  productCard: {
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageContainer: {
    position: 'relative',
  },
  // #41: Dark mode image container
  productImageDarkMode: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  productImage: {
    width: 64,
    height: 64,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: fontFamily.bold,
    textTransform: 'uppercase',
  },
  favoriteBtn: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDivider: {
    width: 1,
    height: 24,
  },
  productInfo: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  productName: {
    fontFamily: fontFamily.regular,
    marginBottom: 2,
  },
  productPrice: {
    fontFamily: fontFamily.bold,
  },
  quickAddBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
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
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
});
