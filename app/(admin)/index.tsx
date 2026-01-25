import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { fetchOrders, selectOrders } from '../../src/store/slices/ordersSlice';
import { fetchProducts } from '../../src/store/slices/productsSlice';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectOrders);
  const products = useAppSelector((state) => state.products.products);

  useEffect(() => {
    dispatch(fetchOrders());
    dispatch(fetchProducts({ includeUnavailable: true })); // Include all products for admin
  }, [dispatch]);

  const pendingOrders = orders.filter(
    (o) => o.status === 'placed' || o.status === 'confirmed'
  );
  const todayOrders = orders.filter((o) => {
    const orderDate = new Date(o.created_at).toDateString();
    return orderDate === new Date().toDateString();
  });
  const activeProducts = products.filter((p) => p.is_available);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{pendingOrders.length}</Text>
          <Text style={styles.statLabel}>{t('admin.pendingOrders')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{todayOrders.length}</Text>
          <Text style={styles.statLabel}>{t('admin.todaysOrders')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activeProducts.length}</Text>
          <Text style={styles.statLabel}>{t('admin.activeProducts')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>{t('admin.totalProducts')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.recentOrders')}</Text>
        {pendingOrders.slice(0, 5).map((order) => (
          <View key={order.id} style={styles.orderRow}>
            <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
            <Text style={styles.orderStatus}>{t(`status.${order.status}`)}</Text>
            <Text style={styles.orderTotal}>
              ₹{(order.total_paise / 100).toFixed(2)}
            </Text>
          </View>
        ))}
        {pendingOrders.length === 0 && (
          <Text style={styles.emptyText}>{t('admin.noPendingOrders')}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    width: '50%',
    padding: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B35',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 20,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  orderStatus: {
    fontSize: 12,
    color: '#FF9800',
    flex: 1,
    textAlign: 'center',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
