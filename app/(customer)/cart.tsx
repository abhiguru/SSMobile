import { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EmptyState } from '../../src/components/common/EmptyState';
import { PriceText } from '../../src/components/common/PriceText';
import { AppButton } from '../../src/components/common/AppButton';
import { StepperControl } from '../../src/components/common/StepperControl';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { EditCartItemSheet } from '../../src/components/common/EditCartItemSheet';
import { useToast } from '../../src/components/common/Toast';

import {
  useGetCartQuery,
  useUpdateCartQuantityMutation,
  useRemoveFromCartMutation,
  useGetProductsQuery,
} from '../../src/store/apiSlice';
import { formatPrice, resolveImageSource, getProductImageUrl } from '../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme';
import { hapticMedium, hapticSuccess } from '../../src/utils/haptics';
import type { ServerCartItem, WeightOption } from '../../src/types';

function formatWeight(grams: number, label?: string): string {
  if (label) return label;
  if (grams >= 1000) {
    const kg = grams / 1000;
    return Number.isInteger(kg) ? `${kg} kg` : `${kg.toFixed(1)} kg`;
  }
  return `${grams}g`;
}

export default function CartScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { appColors, appGradients } = useAppTheme();
  const { showToast } = useToast();
  const isGujarati = i18n.language === 'gu';

  const { data: items = [], isLoading, isFetching, refetch } = useGetCartQuery();
  const { data: products = [] } = useGetProductsQuery();
  const [updateQuantity, { isLoading: isUpdating }] = useUpdateCartQuantityMutation();
  const [removeItem, { isLoading: isRemoving }] = useRemoveFromCartMutation();

  const [editingItem, setEditingItem] = useState<ServerCartItem | null>(null);

  // Calculate total from cart items
  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = item.weight_option?.price_paise ?? 0;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const handleQuantityChange = useCallback(async (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      hapticMedium();
      try {
        await removeItem(cartItemId).unwrap();
      } catch {
        showToast({ message: t('common.error'), type: 'error' });
      }
    } else {
      try {
        await updateQuantity({ cart_item_id: cartItemId, quantity: newQuantity }).unwrap();
      } catch {
        showToast({ message: t('common.error'), type: 'error' });
      }
    }
  }, [removeItem, updateQuantity, showToast, t]);

  const handleRemove = useCallback(async (cartItemId: string) => {
    hapticMedium();
    try {
      await removeItem(cartItemId).unwrap();
    } catch {
      showToast({ message: t('common.error'), type: 'error' });
    }
  }, [removeItem, showToast, t]);

  const handleDismissSheet = useCallback(() => {
    setEditingItem(null);
  }, []);

  const handleUpdateItem = useCallback(async (newWeightOptionId: string, newQuantity: number) => {
    if (!editingItem) return;

    hapticSuccess();

    // If weight option changed, we need to remove old item and add new one
    if (newWeightOptionId !== editingItem.weight_option_id) {
      // For now, just update the quantity if same weight option
      // Weight option changes are handled by removing and re-adding
      showToast({ message: t('cart.weightChangeNotSupported'), type: 'info' });
      return;
    }

    try {
      await updateQuantity({
        cart_item_id: editingItem.id,
        quantity: newQuantity,
      }).unwrap();
      showToast({ message: t('cart.itemUpdated'), type: 'success' });
    } catch {
      showToast({ message: t('common.error'), type: 'error' });
    }
  }, [editingItem, updateQuantity, showToast, t]);

  // Get available weight options for the editing item's product
  const editingProductWeightOptions = useMemo((): WeightOption[] => {
    if (!editingItem) return [];
    const product = products.find((p) => p.id === editingItem.product_id);
    if (!product?.weight_options) return [];
    return product.weight_options
      .filter((wo) => wo.is_available !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [editingItem, products]);

  const renderItem = ({ item }: { item: ServerCartItem }) => {
    const product = item.product;
    const weightOption = item.weight_option;
    const imgSource = product?.image_url
      ? resolveImageSource(product.image_url, null)
      : null;
    const itemPrice = weightOption?.price_paise ?? 0;

    return (
      <AnimatedPressable onPress={() => setEditingItem(item)} scaleDown={0.98}>
        <View style={[styles.cartItem, { backgroundColor: appColors.surface, borderColor: appColors.border }, elevation.level1]}>
          <View style={styles.thumbnailContainer}>
            {imgSource ? (
              <Image source={imgSource} style={styles.thumbnail} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={appGradients.brand as unknown as [string, string]}
                style={styles.thumbnail}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="leaf" size={20} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text variant="titleSmall" style={[styles.itemName, { color: appColors.text.primary }]}>
              {isGujarati && product?.name_gu ? product.name_gu : product?.name}
            </Text>
            <Text variant="bodySmall" style={[styles.itemWeight, { color: appColors.text.secondary }]}>
              {formatWeight(weightOption?.weight_grams ?? 0, weightOption?.weight_label)}
            </Text>
            <Text variant="titleSmall" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>
              {formatPrice(itemPrice)}
            </Text>
          </View>
          <View style={styles.rightSection}>
            <IconButton
              icon="delete-outline"
              iconColor={appColors.negative}
              size={18}
              onPress={() => handleRemove(item.id)}
              style={styles.deleteBtn}
              disabled={isRemoving}
            />
            <StepperControl
              value={item.quantity}
              onValueChange={(newQty) => handleQuantityChange(item.id, newQty)}
              min={1}
              max={99}
            />
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: appColors.shell }]}>
        <ActivityIndicator size="large" color={appColors.brand} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <Animated.View entering={FadeInUp.duration(400)} style={{ flex: 1, backgroundColor: appColors.shell }}>
        <EmptyState icon="cart-off" title={t('cart.empty')} actionLabel={t('cart.startShopping')} onAction={() => router.push('/(customer)')} />
      </Animated.View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={appColors.brand}
          />
        }
      />
      <LinearGradient
        colors={[appColors.surface + '00', appColors.surface]}
        style={styles.footerGradient}
        pointerEvents="none"
      />
      <View style={[styles.footer, { backgroundColor: appColors.surface, borderTopColor: appColors.border }, elevation.level3]}>
        <View style={styles.totalRow}>
          <Text variant="titleMedium" style={[styles.totalLabel, { color: appColors.text.primary }]}>{t('cart.total')}</Text>
          <PriceText paise={total} variant="headlineSmall" />
        </View>
        <AppButton
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.push('/(customer)/checkout')}
        >
          {t('cart.checkout')}
        </AppButton>
      </View>
      <EditCartItemSheet
        item={editingItem}
        weightOptions={editingProductWeightOptions}
        onDismiss={handleDismissSheet}
        onUpdate={handleUpdateItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: spacing.lg, paddingBottom: 140 },
  cartItem: { borderRadius: borderRadius.lg, padding: spacing.lg, flexDirection: 'row', marginBottom: 12, borderWidth: 1 },
  thumbnailContainer: { marginRight: spacing.sm },
  thumbnail: { width: 50, height: 50, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: fontFamily.regular, marginBottom: spacing.xs },
  itemWeight: { marginBottom: spacing.xs },
  rightSection: { alignItems: 'flex-end' },
  deleteBtn: { margin: 0, marginBottom: spacing.xs },
  footerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, zIndex: 1 },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  totalLabel: { fontFamily: fontFamily.semiBold },
});
