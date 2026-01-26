import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, Button, IconButton, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../../src/store';
import {
  selectCartItems,
  selectCartTotal,
  updateQuantity,
  removeFromCart,
} from '../../src/store/slices/cartSlice';
import { formatPrice } from '../../src/constants';
import type { AppTheme } from '../../src/theme';

export default function CartScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();
  const items = useAppSelector(selectCartItems);
  const total = useAppSelector(selectCartTotal);

  const isGujarati = i18n.language === 'gu';

  const handleQuantityChange = (
    productId: string,
    weightOptionId: string,
    delta: number,
    currentQuantity: number
  ) => {
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
          <Text variant="titleSmall" style={styles.itemName}>
            {isGujarati ? item.product.name_gu : item.product.name}
          </Text>
          <Text variant="bodySmall" style={styles.itemWeight}>{item.weight_option.weight_grams}g</Text>
          <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {formatPrice(item.weight_option.price_paise)}
          </Text>
        </View>
        <View style={styles.quantityContainer}>
          <IconButton
            icon="minus"
            mode="contained-tonal"
            size={16}
            onPress={() =>
              handleQuantityChange(
                item.product_id,
                item.weight_option_id,
                -1,
                item.quantity
              )
            }
          />
          <Text variant="titleMedium" style={styles.quantity}>{item.quantity}</Text>
          <IconButton
            icon="plus"
            mode="contained-tonal"
            size={16}
            onPress={() =>
              handleQuantityChange(
                item.product_id,
                item.weight_option_id,
                1,
                item.quantity
              )
            }
          />
        </View>
      </Card.Content>
    </Card>
  );

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="cart-off" size={64} color="#999999" />
        <Text variant="titleMedium" style={styles.emptyTitle}>{t('cart.empty')}</Text>
        <Button
          mode="contained"
          onPress={() => router.push('/(customer)')}
          style={styles.shopButton}
          contentStyle={styles.shopButtonContent}
        >
          {t('cart.startShopping')}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.product_id}-${item.weight_option_id}`}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text variant="titleMedium" style={styles.totalLabel}>{t('cart.total')}</Text>
          <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {formatPrice(total)}
          </Text>
        </View>
        <Button
          mode="contained"
          onPress={() => router.push('/(customer)/checkout')}
          style={styles.checkoutButton}
          contentStyle={styles.checkoutButtonContent}
          labelStyle={styles.checkoutButtonLabel}
        >
          {t('cart.checkout')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#666666',
    marginTop: 16,
    marginBottom: 24,
  },
  shopButton: {
    borderRadius: 8,
  },
  shopButtonContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  listContent: {
    padding: 16,
  },
  cartItem: {
    marginBottom: 12,
  },
  cartItemContent: {
    flexDirection: 'row',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: '#333333',
    marginBottom: 4,
  },
  itemWeight: {
    color: '#666666',
    marginBottom: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantity: {
    fontWeight: '600',
    marginHorizontal: 8,
    color: '#333333',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontWeight: '600',
    color: '#333333',
  },
  checkoutButton: {
    borderRadius: 8,
  },
  checkoutButtonContent: {
    paddingVertical: 8,
  },
  checkoutButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
});
