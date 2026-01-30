import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Text, Switch } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useGetProductsQuery, useToggleProductAvailabilityMutation } from '../../../src/store/apiSlice';
import { Product } from '../../../src/types';
import { SkeletonBox, SkeletonText } from '../../../src/components/common/SkeletonLoader';
import { AnimatedPressable } from '../../../src/components/common/AnimatedPressable';
import { resolveImageSource } from '../../../src/constants';
import { getStoredTokens } from '../../../src/services/supabase';
import { colors, spacing, borderRadius, elevation, fontFamily, gradients } from '../../../src/constants/theme';
import { hapticSelection } from '../../../src/utils/haptics';

type SortKey = 'az' | 'za' | 'available' | 'unavailable' | 'priceLow' | 'priceHigh';

function ProductsSkeleton() {
  return (
    <View style={{ padding: spacing.lg }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonBox width={50} height={50} borderRadius={borderRadius.md} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonText lines={1} width="60%" />
            <SkeletonText lines={1} width="30%" style={{ marginTop: spacing.xs }} />
          </View>
          <SkeletonBox width={50} height={30} borderRadius={borderRadius.md} />
        </View>
      ))}
    </View>
  );
}

const SORT_OPTIONS: { key: SortKey; labelKey: string; toggleKey?: SortKey }[] = [
  { key: 'az', labelKey: 'admin.sortAZ' },
  { key: 'za', labelKey: 'admin.sortZA' },
  { key: 'available', labelKey: 'admin.sortAvailable', toggleKey: 'unavailable' },
  { key: 'priceLow', labelKey: 'admin.sortPriceLow' },
  { key: 'priceHigh', labelKey: 'admin.sortPriceHigh' },
];

function sortProducts(products: Product[], sortKey: SortKey, isGujarati: boolean): Product[] {
  const sorted = [...products];
  const getName = (p: Product) => (isGujarati ? p.name_gu : p.name).toLowerCase();

  switch (sortKey) {
    case 'az':
      return sorted.sort((a, b) => getName(a).localeCompare(getName(b)));
    case 'za':
      return sorted.sort((a, b) => getName(b).localeCompare(getName(a)));
    case 'available':
      return sorted.sort((a, b) => {
        if (a.is_available === b.is_available) return getName(a).localeCompare(getName(b));
        return a.is_available ? -1 : 1;
      });
    case 'unavailable':
      return sorted.sort((a, b) => {
        if (a.is_available === b.is_available) return getName(a).localeCompare(getName(b));
        return a.is_available ? 1 : -1;
      });
    case 'priceLow':
      return sorted.sort((a, b) => a.price_per_kg_paise - b.price_per_kg_paise);
    case 'priceHigh':
      return sorted.sort((a, b) => b.price_per_kg_paise - a.price_per_kg_paise);
    default:
      return sorted;
  }
}

export default function AdminProductsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isGujarati = i18n.language === 'gu';
  const { data: products = [], isLoading, isFetching, refetch } = useGetProductsQuery({ includeUnavailable: true });
  const [toggleAvailability] = useToggleProductAvailabilityMutation();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('az');
  useEffect(() => { getStoredTokens().then(({ accessToken: t }) => setAccessToken(t)); }, []);

  const sortedProducts = useMemo(
    () => sortProducts(products, sortKey, isGujarati),
    [products, sortKey, isGujarati],
  );

  const handleToggleAvailability = (productId: string, currentValue: boolean) => {
    hapticSelection();
    toggleAvailability({ productId, isAvailable: currentValue });
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const imgSource = resolveImageSource(item.image_url, accessToken);

    return (
      <AnimatedPressable
        style={styles.productCard}
        onPress={() => router.push({ pathname: '/(admin)/products/edit', params: { productId: item.id } })}
      >
        <View style={styles.productCardContent}>
          <View style={styles.productImage}>
            {imgSource ? (
              <Image source={imgSource} style={styles.thumbnail} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={gradients.brand as unknown as [string, string]}
                style={styles.thumbnail}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="leaf" size={24} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
          </View>
          <View style={styles.productInfo}>
            <Text variant="titleSmall" style={styles.productName}>{isGujarati ? item.name_gu : item.name}</Text>
            {item.weight_options.length > 0 && (
              <Text variant="bodySmall" style={styles.productOptions}>{t('admin.weightOptions', { count: item.weight_options.length })}</Text>
            )}
          </View>
          <View style={styles.toggleContainer}>
            <Text variant="labelSmall" style={[styles.toggleLabel, item.is_available && { color: colors.positive }]}>
              {item.is_available ? t('admin.available') : t('admin.unavailable')}
            </Text>
            <Switch value={item.is_available} onValueChange={() => handleToggleAvailability(item.id, item.is_available)} color={colors.positive} />
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  if (isLoading && products.length === 0) return <ProductsSkeleton />;

  return (
    <View style={styles.container}>
      <View style={styles.sortBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortBarContent}>
          {SORT_OPTIONS.map(({ key, labelKey, toggleKey }) => {
            const isToggled = toggleKey != null && sortKey === toggleKey;
            const active = sortKey === key || isToggled;
            const displayLabel = isToggled ? t('admin.sortUnavailable') : t(labelKey);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  hapticSelection();
                  if (active && toggleKey) {
                    setSortKey(isToggled ? key : toggleKey);
                  } else {
                    setSortKey(key);
                  }
                }}
                style={[styles.sortChip, active && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                  {displayLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <FlashList key={sortKey} data={sortedProducts} renderItem={renderProduct} estimatedItemSize={82} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  sortBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  sortBarContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  sortChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.lg, backgroundColor: colors.shell, borderWidth: 1, borderColor: colors.border },
  sortChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  sortChipText: { fontSize: 13, fontFamily: fontFamily.regular, color: colors.text.secondary },
  sortChipTextActive: { color: colors.text.inverse, fontFamily: fontFamily.semiBold },
  listContent: { padding: spacing.lg },
  productCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...elevation.level1 },
  productCardContent: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  productImage: {},
  thumbnail: { width: 50, height: 50, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontFamily: fontFamily.regular, color: colors.text.primary, marginBottom: spacing.xs },
  productOptions: { color: colors.text.secondary },
  toggleContainer: { alignItems: 'center' },
  toggleLabel: { color: colors.neutral, marginBottom: spacing.xs },
  skeletonCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: 12, ...elevation.level1 },
});
