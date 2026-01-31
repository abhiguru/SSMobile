import { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated as RNAnimated } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import { Switch } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { useGetProductsQuery, useToggleProductAvailabilityMutation, useDeactivateProductMutation } from '../../../src/store/apiSlice';
import { Product } from '../../../src/types';
import { SkeletonBox, SkeletonText } from '../../../src/components/common/SkeletonLoader';
import { AnimatedPressable } from '../../../src/components/common/AnimatedPressable';
import { resolveImageSource } from '../../../src/constants';
import { getStoredTokens } from '../../../src/services/supabase';
import { colors, spacing, borderRadius, elevation, fontFamily, gradients } from '../../../src/constants/theme';
import { FioriChip } from '../../../src/components/common/FioriChip';
import { FioriDialog } from '../../../src/components/common/FioriDialog';
import { useToast } from '../../../src/components/common/Toast';
import { hapticSelection } from '../../../src/utils/haptics';

type SortKey = 'az' | 'za' | 'available' | 'unavailable' | 'priceLow' | 'priceHigh';

function ProductsSkeleton() {
  return (
    <View style={{ padding: spacing.lg }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonBox width={44} height={44} borderRadius={borderRadius.md} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
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
  const [deactivateProduct] = useDeactivateProductMutation();
  const { showToast } = useToast();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('az');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const openSwipeableRef = useRef<Swipeable | null>(null);
  useEffect(() => { getStoredTokens().then(({ accessToken: t }) => setAccessToken(t)); }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await deactivateProduct(id).unwrap();
      showToast({ message: t('admin.productDeleted'), type: 'success' });
    } catch {
      showToast({ message: t('common.error'), type: 'error' });
    }
  };

  const sortedProducts = useMemo(
    () => sortProducts(products, sortKey, isGujarati),
    [products, sortKey, isGujarati],
  );

  const handleToggleAvailability = (productId: string, currentValue: boolean) => {
    hapticSelection();
    toggleAvailability({ productId, isAvailable: currentValue });
  };

  const renderRightActions = (item: Product) => (
    _progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    return (
      <Pressable
        style={styles.swipeDeleteAction}
        onPress={() => {
          openSwipeableRef.current?.close();
          setDeleteTarget(item);
        }}
      >
        <RNAnimated.View style={{ transform: [{ scale }] }}>
          <MaterialCommunityIcons name="delete-outline" size={24} color={colors.text.inverse} />
          <Text variant="labelSmall" style={styles.swipeDeleteLabel}>{t('admin.deleteProduct')}</Text>
        </RNAnimated.View>
      </Pressable>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const imgSource = resolveImageSource(item.image_url, accessToken);

    return (
      <Swipeable
        ref={(ref) => { if (ref) openSwipeableRef.current = ref; }}
        renderRightActions={renderRightActions(item)}
        overshootRight={false}
        friction={2}
      >
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
                  <MaterialCommunityIcons name="leaf" size={24} color={colors.text.inverse} />
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
              <Switch value={item.is_available} onValueChange={() => handleToggleAvailability(item.id, item.is_available)} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.surface} ios_backgroundColor={colors.border} />
            </View>
          </View>
        </AnimatedPressable>
      </Swipeable>
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
              <FioriChip
                key={key}
                label={displayLabel}
                selected={active}
                onPress={() => {
                  hapticSelection();
                  if (active && toggleKey) {
                    setSortKey(isToggled ? key : toggleKey);
                  } else {
                    setSortKey(key);
                  }
                }}
              />
            );
          })}
        </ScrollView>
      </View>
      <FlashList key={sortKey} data={sortedProducts} renderItem={renderProduct} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/(admin)/products/edit')}
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.text.inverse} />
      </Pressable>
      <FioriDialog
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        title={t('admin.deleteProductConfirmTitle')}
        actions={[
          { label: t('common.cancel'), onPress: () => setDeleteTarget(null), variant: 'text' },
          { label: t('admin.deleteProduct'), onPress: handleDeleteConfirm, variant: 'danger' },
        ]}
      >
        <Text variant="bodyMedium" style={{ color: colors.text.secondary }}>
          {t('admin.deleteProductConfirm')}
        </Text>
      </FioriDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  sortBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  sortBarContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  listContent: { padding: spacing.lg },
  productCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...elevation.level1 },
  productCardContent: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  productImage: {},
  thumbnail: { width: 44, height: 44, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: spacing.md },
  productName: { fontFamily: fontFamily.regular, color: colors.text.primary, marginBottom: spacing.xs },
  productOptions: { color: colors.text.secondary },
  toggleContainer: { alignItems: 'center' },
  toggleLabel: { color: colors.neutral, marginBottom: spacing.xs },
  swipeDeleteAction: { backgroundColor: colors.negative, borderRadius: borderRadius.lg, marginBottom: spacing.md, justifyContent: 'center', alignItems: 'center', width: 80 },
  swipeDeleteLabel: { color: colors.text.inverse, marginTop: spacing.xs, fontSize: 10 },
  skeletonCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...elevation.level1 },
  fab: { position: 'absolute', bottom: spacing.xl, right: spacing.xl, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand, justifyContent: 'center', alignItems: 'center', ...elevation.level3 },
});
