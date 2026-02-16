import { useCallback, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';

import { EmptyState } from '../../src/components/common/EmptyState';
import { AppButton } from '../../src/components/common/AppButton';
import { StepperControl } from '../../src/components/common/StepperControl';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { EditCartItemSheet } from '../../src/components/common/EditCartItemSheet';
import { FioriDialog } from '../../src/components/common/FioriDialog';

import {
  useGetCartQuery,
  useUpdateCartQuantityMutation,
  useRemoveFromCartMutation,
  useUpdateCartItemWeightMutation,
  useToggleFavoriteMutation,
  useClearServerCartMutation,
} from '../../src/store/apiSlice';
import { formatPrice, resolveImageSource } from '../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme';
import { hapticMedium, hapticSuccess } from '../../src/utils/haptics';
import { formatWeight } from '../../src/utils/formatters';
import type { ServerCartItem } from '../../src/types';

export default function CartScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { appColors, appGradients } = useAppTheme();
  const isGujarati = i18n.language === 'gu';

  const { data: items = [], isLoading, isFetching, refetch } = useGetCartQuery();
  const [updateQuantity, { isLoading: isUpdating }] = useUpdateCartQuantityMutation();
  const [removeItem, { isLoading: isRemoving }] = useRemoveFromCartMutation();
  const [updateCartItemWeight] = useUpdateCartItemWeightMutation();
  const [toggleFavorite] = useToggleFavoriteMutation();
  const [clearServerCart, { isLoading: isClearing }] = useClearServerCartMutation();

  const [editingItem, setEditingItem] = useState<ServerCartItem | null>(null);
  const [clearDialogVisible, setClearDialogVisible] = useState(false);
  const navigation = useNavigation();

  const handleClearCart = useCallback(async () => {
    setClearDialogVisible(false);
    hapticMedium();
    try {
      await clearServerCart().unwrap();
    } catch {
      // Error handling without toast
    }
  }, [clearServerCart]);

  useLayoutEffect(() => {
    if (items.length > 0) {
      navigation.setOptions({
        headerRight: () => (
          <IconButton
            icon="delete-sweep-outline"
            iconColor={appColors.negative}
            size={22}
            onPress={() => setClearDialogVisible(true)}
            disabled={isClearing}
            accessibilityLabel={t('cart.clearCart')}
            style={{ marginRight: 4 }}
          />
        ),
      });
    } else {
      navigation.setOptions({ headerRight: () => null });
    }
  }, [navigation, items.length, appColors, isClearing, t]);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  // Calculate total from cart items (use line_total_paise from RPC)
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.line_total_paise || 0), 0);
  }, [items]);

  const handleQuantityChange = useCallback(async (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      hapticMedium();
      try {
        await removeItem(cartItemId).unwrap();
      } catch {
        // Error handling without toast
      }
    } else {
      try {
        await updateQuantity({ cart_item_id: cartItemId, quantity: newQuantity }).unwrap();
      } catch {
        // Error handling without toast
      }
    }
  }, [removeItem, updateQuantity, t]);

  const handleRemove = useCallback(async (cartItemId: string) => {
    hapticMedium();
    try {
      await removeItem(cartItemId).unwrap();
    } catch {
      // Error handling without toast
    }
  }, [removeItem, t]);

  const handleDismissSheet = useCallback(() => {
    setEditingItem(null);
  }, []);

  // #12: Move item to favorites before removing from cart
  const handleMoveToFavorites = useCallback(async (item: ServerCartItem) => {
    hapticMedium();
    try {
      // Add to favorites
      await toggleFavorite(item.product_id).unwrap();
      // Remove from cart
      await removeItem(item.id).unwrap();
    } catch {
      // Error handling without toast
    }
    // Close swipeable
    swipeableRefs.current.get(item.id)?.close();
  }, [toggleFavorite, removeItem, t]);

  // #11: Swipe action render functions
  const renderRightActions = useCallback((item: ServerCartItem) => {
    return (
      <View style={styles.swipeActionsRight}>
        <Pressable
          style={[styles.swipeAction, { backgroundColor: appColors.informative }]}
          onPress={() => handleMoveToFavorites(item)}
          accessibilityLabel={t('cart.moveToFavorites')}
        >
          <MaterialCommunityIcons name="heart-outline" size={22} color="#fff" />
          <Text style={styles.swipeActionText}>{t('favorites.title')}</Text>
        </Pressable>
        <Pressable
          style={[styles.swipeAction, { backgroundColor: appColors.negative }]}
          onPress={() => handleRemove(item.id)}
          accessibilityLabel={t('accessibility.removeItem')}
        >
          <MaterialCommunityIcons name="delete-outline" size={22} color="#fff" />
          <Text style={styles.swipeActionText}>{t('common.delete')}</Text>
        </Pressable>
      </View>
    );
  }, [appColors, handleMoveToFavorites, handleRemove, t]);

  const handleUpdateItem = useCallback(async (newWeightGrams: number, newQuantity: number) => {
    if (!editingItem) return;

    hapticSuccess();

    const weightChanged = newWeightGrams !== editingItem.weight_grams;

    try {
      if (weightChanged) {
        // Update weight in-place using RPC (preserves cart item order)
        await updateCartItemWeight({
          cart_item_id: editingItem.id,
          new_weight_grams: newWeightGrams,
          new_quantity: newQuantity,
        }).unwrap();
      } else {
        // Just update quantity
        await updateQuantity({
          cart_item_id: editingItem.id,
          quantity: newQuantity,
        }).unwrap();
      }
    } catch {
      // Error handling without toast
    }
  }, [editingItem, updateCartItemWeight, updateQuantity, t]);

  // #11: Swipe-to-delete with swipeable wrapper
  const renderItem = ({ item }: { item: ServerCartItem }) => {
    // Fiori Object Cell: 44x44 thumbnails, request 88x88 for 2x retina
    const imgSource = item.product_image_url
      ? resolveImageSource(item.product_image_url, null, { width: 88, height: 88, quality: 60 })
      : null;

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(item.id, ref);
          else swipeableRefs.current.delete(item.id);
        }}
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        friction={2}
      >
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
                {isGujarati && item.product_name_gu ? item.product_name_gu : item.product_name}
              </Text>
              <Text variant="bodySmall" style={[styles.itemWeight, { color: appColors.text.secondary }]}>
                {formatWeight(item.weight_grams, { label: item.weight_label })}
              </Text>
              <Text variant="titleSmall" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>
                {formatPrice(item.unit_price_paise)}
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
                accessibilityLabel={t('accessibility.removeItem')}
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
      </Swipeable>
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
      <View style={[styles.footer, { backgroundColor: appColors.surface, borderTopColor: appColors.border }, elevation.level3]}>
        <View style={styles.totalRow}>
          <Text variant="titleMedium" style={[styles.totalLabel, { color: appColors.text.primary }]}>{t('cart.total')}</Text>
          <Text style={[styles.totalValue, { color: appColors.text.primary }]}>{formatPrice(total)}</Text>
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
        onDismiss={handleDismissSheet}
        onUpdate={handleUpdateItem}
      />
      <FioriDialog
        visible={clearDialogVisible}
        onDismiss={() => setClearDialogVisible(false)}
        title={t('cart.clearCartConfirmTitle')}
        actions={[
          { label: t('common.cancel'), onPress: () => setClearDialogVisible(false), variant: 'text' },
          { label: t('cart.clearCart'), onPress: handleClearCart, variant: 'danger' },
        ]}
      >
        <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>
          {t('cart.clearCartConfirmMessage')}
        </Text>
      </FioriDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: spacing.lg, paddingBottom: 140 },
  cartItem: { borderRadius: borderRadius.lg, padding: spacing.lg, flexDirection: 'row', marginBottom: 12, borderWidth: 1 },
  thumbnailContainer: { marginRight: spacing.sm },
  // Fiori Object Cell: 44x44 image with 8pt radius
  thumbnail: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: fontFamily.regular, marginBottom: spacing.xs },
  itemWeight: { marginBottom: spacing.xs },
  rightSection: { alignItems: 'flex-end' },
  deleteBtn: { margin: 0, marginBottom: spacing.xs },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  totalLabel: { fontFamily: fontFamily.semiBold },
  totalValue: { fontSize: 20, fontFamily: fontFamily.bold },
  // #11: Swipe action styles
  swipeActionsRight: { flexDirection: 'row', marginBottom: 12 },
  swipeAction: { width: 72, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.sm },
  swipeActionText: { color: '#fff', fontSize: 11, marginTop: 4, fontFamily: fontFamily.semiBold },
});
