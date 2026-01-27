import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, Button, IconButton, useTheme } from 'react-native-paper';

import { EmptyState } from '../../src/components/common/EmptyState';
import { PriceText } from '../../src/components/common/PriceText';

import { useAppDispatch, useAppSelector } from '../../src/store';
import {
  selectCartItems,
  selectCartTotal,
  updateQuantity,
  removeFromCart,
} from '../../src/store/slices/cartSlice';
import { formatPrice } from '../../src/constants';
import { colors, spacing, borderRadius, fontSize } from '../../src/constants/theme';
import type { AppTheme } from '../../src/theme';

export default function CartScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();
  const items = useAppSelector(selectCartItems);
  const total = useAppSelector(selectCartTotal);
  const isGujarati = i18n.language === 'gu';

  const handleQuantityChange = (productId: string, weightOptionId: string, delta: number, currentQuantity: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity <= 0) {
      dispatch(removeFromCart({ productId, weightOptionId }));
    } else {
      dispatch(updateQuantity({ productId, weightOptionId, quantity: newQuantity }));
    }
  };

  const renderItem = ({ item }: { item: typeof items[0] }) => (
    <Card mode="elevated" style={styles.cartItem}>
      <Card.Content style={styles.cartItemContent}>
        <View style={styles.itemInfo}>
          <Text variant="titleSmall" style={styles.itemName}>{isGujarati ? item.product.name_gu : item.product.name}</Text>
          <Text variant="bodySmall" style={styles.itemWeight}>{item.weight_option.weight_grams}g</Text>
          <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(item.weight_option.price_paise)}</Text>
        </View>
        <View style={styles.quantityContainer}>
          <IconButton icon="minus" mode="contained-tonal" size={16} onPress={() => handleQuantityChange(item.product_id, item.weight_option_id, -1, item.quantity)} />
          <View style={styles.quantityBadge}>
            <Text variant="titleMedium" style={styles.quantity}>{item.quantity}</Text>
          </View>
          <IconButton icon="plus" mode="contained-tonal" size={16} onPress={() => handleQuantityChange(item.product_id, item.weight_option_id, 1, item.quantity)} />
        </View>
      </Card.Content>
    </Card>
  );

  if (items.length === 0) {
    return <EmptyState icon="cart-off" title={t('cart.empty')} actionLabel={t('cart.startShopping')} onAction={() => router.push('/(customer)')} />;
  }

  return (
    <View style={styles.container}>
      <FlashList data={items} renderItem={renderItem} keyExtractor={(item) => `${item.product_id}-${item.weight_option_id}`} contentContainerStyle={styles.listContent} />
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text variant="titleMedium" style={styles.totalLabel}>{t('cart.total')}</Text>
          <PriceText paise={total} variant="headlineSmall" />
        </View>
        <Button mode="contained" onPress={() => router.push('/(customer)/checkout')} style={styles.checkoutButton} contentStyle={styles.checkoutButtonContent} labelStyle={styles.checkoutButtonLabel}>
          {t('cart.checkout')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  listContent: { padding: spacing.md },
  cartItem: { marginBottom: 12 },
  cartItemContent: { flexDirection: 'row' },
  itemInfo: { flex: 1 },
  itemName: { color: colors.text.primary, marginBottom: spacing.xs },
  itemWeight: { color: colors.text.secondary, marginBottom: spacing.xs },
  quantityContainer: { flexDirection: 'row', alignItems: 'center' },
  quantityBadge: { backgroundColor: colors.secondary, borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minWidth: 32, alignItems: 'center' },
  quantity: { fontWeight: '600', color: colors.text.primary },
  footer: { backgroundColor: colors.background.primary, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border.light },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  totalLabel: { fontWeight: '600', color: colors.text.primary },
  checkoutButton: { borderRadius: borderRadius.md },
  checkoutButtonContent: { paddingVertical: spacing.sm },
  checkoutButtonLabel: { fontSize: fontSize.xl, fontWeight: '600' },
});
