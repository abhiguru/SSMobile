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
import { spacing, borderRadius, elevation, fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme/useAppTheme';
import { FioriChip } from '../../../src/components/common/FioriChip';
import { FioriDialog } from '../../../src/components/common/FioriDialog';
import { useToast } from '../../../src/components/common/Toast';
import { hapticSelection } from '../../../src/utils/haptics';

type SortKey = 'az' | 'za' | 'available' | 'unavailable' | 'priceLow' | 'priceHigh';

function ProductsSkeleton() {
  return (
    <View style={{ padding: spacing.lg }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.skeletonCardLayout}>
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
  const { appColors, appGradients } = useAppTheme();
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
    progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, -60, 0],
      outputRange: [1, 0.8, 0.4],
      extrapolate: 'clamp',
    });
    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.6, 1],
    });
    return (
      <Pressable
        style={[styles.swipeDeleteAction, { backgroundColor: appColors.negative }]}
        onPress={() => {
          hapticSelection();
          openSwipeableRef.current?.close();
          setDeleteTarget(item);
        }}
      >
        <RNAnimated.View style={[styles.swipeDeleteContent, { opacity, transform: [{ scale }] }]}>
          <MaterialCommunityIcons name="delete-outline" size={22} color={appColors.text.inverse} />
          <Text style={[styles.swipeDeleteLabel, { color: appColors.text.inverse }]}>{t('common.delete')}</Text>
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
          style={[styles.productCard, { backgroundColor: appColors.surface, borderColor: appColors.border }]}
          onPress={() => router.push({ pathname: '/(admin)/products/edit', params: { productId: item.id } })}
        >
          <View style={styles.productCardContent}>
            <View style={styles.productImage}>
              {imgSource ? (
                <Image source={imgSource} style={styles.thumbnail} contentFit="cover" />
              ) : (
                <LinearGradient
                  colors={appGradients.brand as unknown as [string, string]}
                  style={styles.thumbnail}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="leaf" size={24} color={appColors.text.inverse} />
                </LinearGradient>
              )}
            </View>
            <View style={styles.productInfo}>
              <Text variant="titleSmall" style={[styles.productName, { color: appColors.text.primary }]}>{isGujarati ? item.name_gu : item.name}</Text>
              {item.weight_options.length > 0 && (
                <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{t('admin.weightOptions', { count: item.weight_options.length })}</Text>
              )}
            </View>
            <View style={styles.toggleContainer}>
              <Text variant="labelSmall" style={[styles.toggleLabel, { color: item.is_available ? appColors.positive : appColors.neutral }]}>
                {item.is_available ? t('admin.available') : t('admin.unavailable')}
              </Text>
              <Switch value={item.is_available} onValueChange={() => handleToggleAvailability(item.id, item.is_available)} trackColor={{ false: appColors.border, true: appColors.brand }} thumbColor={appColors.surface} ios_backgroundColor={appColors.border} />
            </View>
          </View>
        </AnimatedPressable>
      </Swipeable>
    );
  };

  if (isLoading && products.length === 0) return <ProductsSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <View style={[styles.sortBar, { backgroundColor: appColors.surface, borderBottomColor: appColors.border }]}>
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
        style={[styles.fab, { backgroundColor: appColors.brand }]}
        onPress={() => router.push('/(admin)/products/edit')}
      >
        <MaterialCommunityIcons name="plus" size={28} color={appColors.text.inverse} />
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
        <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>
          {t('admin.deleteProductConfirm')}
        </Text>
      </FioriDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sortBar: { borderBottomWidth: 1 },
  sortBarContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  listContent: { padding: spacing.lg },
  productCard: { borderRadius: borderRadius.lg, marginBottom: spacing.md, borderWidth: 1, ...elevation.level1 },
  productCardContent: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  productImage: {},
  thumbnail: { width: 44, height: 44, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: spacing.md },
  productName: { fontFamily: fontFamily.regular, marginBottom: spacing.xs },
  toggleContainer: { alignItems: 'center' },
  toggleLabel: { marginBottom: spacing.xs },
  swipeDeleteAction: { borderTopRightRadius: borderRadius.lg, borderBottomRightRadius: borderRadius.lg, marginBottom: spacing.md, justifyContent: 'center', alignItems: 'center', width: 88, marginLeft: -borderRadius.lg },
  swipeDeleteContent: { alignItems: 'center', paddingLeft: borderRadius.lg },
  swipeDeleteLabel: { fontFamily: fontFamily.semiBold, marginTop: 2, fontSize: 11, letterSpacing: 0.3 },
  skeletonCardLayout: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, ...elevation.level1 },
  fab: { position: 'absolute', bottom: spacing.xl, right: spacing.xl, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', ...elevation.level3 },
});
