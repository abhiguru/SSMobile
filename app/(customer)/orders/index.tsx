import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../src/store';
import { fetchOrders, selectOrders } from '../../../src/store/slices/ordersSlice';
import { formatPrice } from '../../../src/constants';
import { Order } from '../../../src/types';

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectOrders);
  const { isLoading } = useAppSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
      case 'delivery_failed':
        return '#E53935';
      case 'out_for_delivery':
        return '#2196F3';
      default:
        return '#FF9800';
    }
  };

  const getOrderDisplayNumber = (order: Order) => {
    // Use order_number if available, otherwise fall back to ID slice
    if (order.order_number) {
      return order.order_number;
    }
    return `#${order.id.slice(0, 8).toUpperCase()}`;
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/(customer)/orders/${item.id}`)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>
          {t('orders.orderNumber', { id: getOrderDisplayNumber(item) })}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{t(`status.${item.status}`)}</Text>
        </View>
      </View>

      <Text style={styles.orderDate}>
        {t('orders.placedOn')}: {new Date(item.created_at).toLocaleDateString()}
      </Text>

      <View style={styles.orderFooter}>
        <Text style={styles.itemCount}>
          {t('orders.items', { count: item.items.length })}
        </Text>
        <Text style={styles.orderTotal}>{formatPrice(item.total_paise)}</Text>
      </View>

      {item.status === 'out_for_delivery' && item.delivery_otp && (
        <View style={styles.otpContainer}>
          <Text style={styles.otpLabel}>{t('orders.deliveryOtp')}:</Text>
          <Text style={styles.otpCode}>{item.delivery_otp}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading && orders.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>{t('orders.empty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={() => dispatch(fetchOrders())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#666666',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderDate: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: 14,
    color: '#666666',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  otpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  otpLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  otpCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 2,
  },
});
