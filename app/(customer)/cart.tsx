import { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, IconButton } from 'react-native-paper';
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

import { useAppDispatch, useAppSelector } from '../../src/store';
import {
  selectCartItems,
  selectCartTotal,
  updateQuantity,
  updateCartItem,
  removeFromCart,
} from '../../src/store/slices/cartSlice';
import { formatPrice, getPerKgPaise, resolveImageSource } from '../../src/constants';
import { getStoredTokens } from '../../src/services/supabase';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme';
import { hapticMedium, hapticSuccess } from '../../src/utils/haptics';
import type { CartItem } from '../../src/types';

export default function CartScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { appColors, appGradients } = useAppTheme();
  const { showToast } = useToast();
  const items = useAppSelector(selectCartItems);
  const total = useAppSelector(selectCartTotal);
  const isGujarati = i18n.language === 'gu';
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => { getStoredTokens().then(({ accessToken: t }) => setAccessToken(t)); }, []);

  const handleQuantityChange = useCallback((productId: string, weightGrams: number, delta: number, currentQuantity: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity <= 0) {
      hapticMedium();
      dispatch(removeFromCart({ productId, weightGrams }));
    } else {
      dispatch(updateQuantity({ productId, weightGrams, quantity: newQuantity }));
    }
  }, [dispatch]);

  const handleRemove = useCallback((productId: string, weightGrams: number) => {
    hapticMedium();
    dispatch(removeFromCart({ productId, weightGrams }));
  }, [dispatch]);

  const handleDismissSheet = useCallback(() => {
    setEditingItem(null);
  }, []);

  const handleUpdateItem = useCallback((newWeightGrams: number, newQuantity: number) => {
    if (!editingItem) return;
    hapticSuccess();
    dispatch(updateCartItem({
      productId: editingItem.product_id,
      oldWeightGrams: editingItem.weight_grams,
      newWeightGrams,
      newQuantity,
      product: editingItem.product,
    }));
    showToast({ message: t('cart.itemUpdated'), type: 'success' });
  }, [dispatch, editingItem, showToast, t]);

  const renderItem = ({ item }: { item: typeof items[0] }) => {
    const imgSource = resolveImageSource(item.product?.image_url, accessToken);

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
            <Text variant="titleSmall" style={[styles.itemName, { color: appColors.text.primary }]}>{isGujarati ? item.product.name_gu : item.product.name}</Text>
            <Text variant="bodySmall" style={[styles.itemWeight, { color: appColors.text.secondary }]}>{item.weight_grams >= 1000 ? `${(item.weight_grams / 1000)}kg` : `${item.weight_grams}g`}</Text>
            <Text variant="titleSmall" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>{formatPrice(Math.round(getPerKgPaise(item.product) * item.weight_grams / 1000))}</Text>
          </View>
          <View style={styles.rightSection}>
            <IconButton
              icon="delete-outline"
              iconColor={appColors.negative}
              size={18}
              onPress={() => handleRemove(item.product_id, item.weight_grams)}
              style={styles.deleteBtn}
            />
            <StepperControl
              value={item.quantity}
              onValueChange={(newQty) => {
                if (newQty <= 0) {
                  handleRemove(item.product_id, item.weight_grams);
                } else {
                  handleQuantityChange(item.product_id, item.weight_grams, newQty - item.quantity, item.quantity);
                }
              }}
              min={1}
              max={99}
            />
          </View>
        </View>
      </AnimatedPressable>
    );
  };

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
        keyExtractor={(item) => `${item.product_id}-${item.weight_grams}`}
        contentContainerStyle={styles.listContent}
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
        onDismiss={handleDismissSheet}
        onUpdate={handleUpdateItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: 140 },
  cartItem: { borderRadius: borderRadius.lg, padding: spacing.lg, flexDirection: 'row', marginBottom: 12, borderWidth: 1 },
  thumbnailContainer: { marginRight: spacing.sm },
  thumbnail: { width: 50, height: 50, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: fontFamily.regular, marginBottom: spacing.xs },
  itemWeight: { marginBottom: spacing.xs },
  rightSection: { alignItems: 'flex-end' },
  deleteBtn: { margin: 0, marginBottom: spacing.xs },
  quantityContainer: { flexDirection: 'row', alignItems: 'center' },
  quantityBadge: { borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minWidth: 32, alignItems: 'center' },
  quantity: { fontFamily: fontFamily.semiBold },
  footerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, zIndex: 1 },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  totalLabel: { fontFamily: fontFamily.semiBold },
});
