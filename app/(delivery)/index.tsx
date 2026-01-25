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

import { useAppDispatch, useAppSelector } from '../../src/store';
import { fetchOrders, selectOrders } from '../../src/store/slices/ordersSlice';
import { formatPrice } from '../../src/constants';
import { Order } from '../../src/types';

export default function DeliveriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectOrders);
  const { isLoading } = useAppSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  // Filter for deliveries assigned to this delivery person
  const activeDeliveries = orders.filter(
    (o) => o.status === 'out_for_delivery'
  );

  const renderDelivery = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.deliveryCard}
      onPress={() => router.push(`/(delivery)/${item.id}`)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
        <Text style={styles.orderTotal}>{formatPrice(item.total_paise)}</Text>
      </View>

      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>Deliver to:</Text>
        <Text style={styles.address}>{item.delivery_address}</Text>
        <Text style={styles.pincode}>Pincode: {item.delivery_pincode}</Text>
      </View>

      <View style={styles.itemsContainer}>
        <Text style={styles.itemCount}>{item.items.length} items</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && orders.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (activeDeliveries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🚚</Text>
        <Text style={styles.emptyTitle}>{t('delivery.noDeliveries')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activeDeliveries}
        renderItem={renderDelivery}
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
  deliveryCard: {
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  pincode: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 12,
  },
  itemCount: {
    fontSize: 14,
    color: '#666666',
  },
});
