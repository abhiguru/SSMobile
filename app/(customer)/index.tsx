import { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef, memo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  FlatList,
  PanResponder,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Chip, Text, Button, Searchbar, Badge, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp, FadeInDown, FadeOutUp,
  useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { useGetProductsQuery, useGetCategoriesQuery, useGetFavoritesQuery, useToggleFavoriteMutation } from '../../src/store/apiSlice';
import { useAppSelector, useAppDispatch } from '../../src/store';
import type { Product } from '../../src/types';
import { selectCartItemCount, addToCart } from '../../src/store/slices/cartSlice';
import { getPerKgPaise, resolveImageSource } from '../../src/constants';
import { getStoredTokens } from '../../src/services/supabase';
import { colors, spacing, borderRadius, elevation, gradients, fontFamily } from '../../src/constants/theme';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { SkeletonBox, SkeletonText } from '../../src/components/common/SkeletonLoader';
import { QuickAddSheet } from '../../src/components/common/QuickAddSheet';
import { useToast } from '../../src/components/common/Toast';
import { hapticLight } from '../../src/utils/haptics';
import type { AppTheme } from '../../src/theme';

type ListItem =
  | { type: 'header'; letter: string }
  | { type: 'product'; product: Product };

const HEADER_HEIGHT = 28;
const ITEM_HEIGHT = 76; // card(64) + marginBottom(8) + border(2) + small rounding
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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
        style={[styles.alphabetLetter, !hasProducts && styles.alphabetLetterMuted]}
      >
        {letter}
      </Animated.Text>
    </Animated.View>
  );
});

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
  const [toggleFav] = useToggleFavoriteMutation();
  const isLoading = productsLoading;
  const error = productsError
    ? (typeof productsError === 'object' && 'data' in productsError
        ? String(productsError.data)
        : 'Failed to load products')
    : null;

  const dispatch = useAppDispatch();
  const cartCount = useAppSelector(selectCartItemCount);
  const navigation = useNavigation();
  const { showToast } = useToast();

  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => { getStoredTokens().then(({ accessToken: t }) => setAccessToken(t)); }, []);

  const handleQuickAdd = useCallback((product: Product, weightGrams: number, quantity: number) => {
    dispatch(addToCart({ product, weightGrams, quantity }));
    showToast({ message: t('product.addedToCart'), type: 'success' });
  }, [dispatch, showToast, t]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isGujarati = i18n.language === 'gu';

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
          <Pressable onPress={toggleSearch} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons
              name={searchOpen ? 'close' : 'magnify'}
              size={24}
              color={colors.text.primary}
            />
          </Pressable>
          <Pressable onPress={() => router.push('/(customer)/cart')} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="cart-outline" size={24} color={colors.text.primary} />
            {cartCount > 0 && (
              <Badge
                size={16}
                style={styles.cartBadge}
              >
                {cartCount > 9 ? '9+' : cartCount}
              </Badge>
            )}
          </Pressable>
        </View>
      ),
    });
  }, [navigation, searchOpen, cartCount, router, toggleSearch]);

  const flatListRef = useRef<FlatList<ListItem>>(null);

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
    const displayName = (p: Product) =>
      (isGujarati ? p.name_gu || p.name : p.name).toLowerCase();
    return [...result].sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }, [products, searchQuery, selectedCategory, isGujarati]);

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
      console.log('[Rail] GRANT y=', y, 'railHeight=', h);
      if (h === 0) return;
      const idx = Math.min(25, Math.max(0, Math.floor((y / h) * 26)));
      const letter = ALPHABET[idx];
      console.log('[Rail] idx=', idx, 'letter=', letter, 'hasProducts=', activeLetters.has(letter));
      activeLetterIdx.value = idx;
      lastScrolledIdx.current = idx;
      if (activeLetters.has(letter)) {
        hapticLight();
        handleLetterPress(letter);
      }
    },
    onPanResponderMove: (evt) => {
      const y = evt.nativeEvent.locationY;
      const h = railHeight.current;
      if (h === 0) return;
      const idx = Math.min(25, Math.max(0, Math.floor((y / h) * 26)));
      activeLetterIdx.value = idx;
      if (idx !== lastScrolledIdx.current) {
        const letter = ALPHABET[idx];
        console.log('[Rail] MOVE letter=', letter, 'hasProducts=', activeLetters.has(letter));
        lastScrolledIdx.current = idx;
        if (activeLetters.has(letter)) {
          hapticLight();
          handleLetterPress(letter);
        }
      }
    },
    onPanResponderRelease: () => {
      console.log('[Rail] RELEASE');
      activeLetterIdx.value = -1;
      lastScrolledIdx.current = -1;
    },
    onPanResponderTerminate: () => {
      console.log('[Rail] TERMINATED (gesture stolen)');
      activeLetterIdx.value = -1;
      lastScrolledIdx.current = -1;
    },
  }), [activeLetters, handleLetterPress, activeLetterIdx]);

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

  const renderListItem = useCallback(({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.letter}</Text>
        </View>
      );
    }

    const product = item.product;
    const isFav = favorites.includes(product.id);
    const imgSource = resolveImageSource(product.image_url, accessToken, { width: 128, height: 128, quality: 70 });

    return (
      <Animated.View entering={FadeInUp.delay(Math.min(index, 10) * 50).duration(400)}>
        <AnimatedPressable
          onPress={() => router.push(`/(customer)/product/${product.id}`)}
          style={styles.productCard}
        >
          <View style={styles.productImageWrapper}>
            {imgSource ? (
              <Image
                source={imgSource}
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
                <MaterialCommunityIcons name="leaf" size={28} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
            <AnimatedPressable
              onPress={() => handleToggleFavorite(product.id)}
              style={styles.favoriteBtn}
            >
              <MaterialCommunityIcons
                name={isFav ? 'heart' : 'heart-outline'}
                size={16}
                color={isFav ? colors.negative : colors.text.inverse}
              />
            </AnimatedPressable>
          </View>
          <View style={styles.productInfo}>
            <Text variant="titleSmall" numberOfLines={2} style={styles.productName}>
              {isGujarati ? product.name_gu : product.name}
            </Text>
            {getPerKgPaise(product) > 0 && (
              <Text variant="labelMedium" style={styles.productPrice}>
                ₹{(getPerKgPaise(product) / 100).toFixed(0)}/kg
              </Text>
            )}
          </View>
          <AnimatedPressable
            onPress={() => {
              hapticLight();
              setQuickAddProduct(product);
            }}
            style={styles.quickAddBtn}
          >
            <MaterialCommunityIcons name="cart-plus" size={22} color={colors.brand} />
          </AnimatedPressable>
        </AnimatedPressable>
      </Animated.View>
    );
  }, [favorites, isGujarati, router, handleToggleFavorite, setQuickAddProduct, accessToken]);

  const getListItemKey = useCallback((item: ListItem) => {
    return item.type === 'header' ? `header-${item.letter}` : item.product.id;
  }, []);

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.container}>
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
      {searchOpen && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutUp.duration(150)}
          style={styles.searchBarContainer}
        >
          <Searchbar
            placeholder={t('home.searchProducts')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
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

          {searchQuery.trim() && filteredProducts.length === 0 ? (
            <View style={styles.noResults}>
              <MaterialCommunityIcons name="magnify-close" size={48} color={colors.neutral} />
              <Text variant="bodyLarge" style={styles.noResultsText}>{t('common.noResults')}</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={flatData}
              renderItem={renderListItem}
              keyExtractor={getListItemKey}
              contentContainerStyle={styles.productsList}
              stickyHeaderIndices={stickyIndices}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          )}
        </View>
        <View
          style={styles.alphabetBar}
          onLayout={onRailLayout}
          {...railPanResponder.panHandlers}
        >
          {ALPHABET.map((letter, i) => (
            <FisheyeLetter
              key={letter}
              letter={letter}
              index={i}
              activeIdx={activeLetterIdx}
              hasProducts={activeLetters.has(letter)}
            />
          ))}
        </View>
      </View>
      <QuickAddSheet
        product={quickAddProduct}
        onDismiss={() => setQuickAddProduct(null)}
        onAdd={handleQuickAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.shell,
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
    backgroundColor: colors.negative,
    color: colors.text.inverse,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  categoriesList: {
    paddingHorizontal: 12,
    paddingTop: spacing.sm,
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
  listArea: {
    flex: 1,
    flexDirection: 'row',
  },
  listColumn: {
    flex: 1,
  },
  alphabetBar: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: colors.shell,
  },
  alphabetLetterBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  alphabetLetter: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.brand,
    textAlign: 'center',
    lineHeight: 18,
  },
  alphabetLetterMuted: {
    color: colors.neutralLight,
  },
  sectionHeader: {
    backgroundColor: colors.shell,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  productsList: {
    paddingBottom: spacing.md,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    ...elevation.level2,
  },
  productImageWrapper: {
    position: 'relative',
  },
  productImage: {
    width: 64,
    height: 64,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  productName: {
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
    marginBottom: 2,
  },
  productPrice: {
    color: colors.brand,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    ...elevation.level1,
  },
});
