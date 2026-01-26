import { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, Divider, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { fetchOrders, selectOrders } from '../../src/store/slices/ordersSlice';
import { fetchProducts } from '../../src/store/slices/productsSlice';
import type { AppTheme } from '../../src/theme';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();
  const orders = useAppSelector(selectOrders);
  const products = useAppSelector((state) => state.products.products);

  useEffect(() => {
    dispatch(fetchOrders());
    dispatch(fetchProducts({ includeUnavailable: true }));
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
        <Card mode="elevated" style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {pendingOrders.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.pendingOrders')}</Text>
          </Card.Content>
        </Card>
        <Card mode="elevated" style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {todayOrders.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.todaysOrders')}</Text>
          </Card.Content>
        </Card>
        <Card mode="elevated" style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {activeProducts.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.activeProducts')}</Text>
          </Card.Content>
        </Card>
        <Card mode="elevated" style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {products.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('admin.totalProducts')}</Text>
          </Card.Content>
        </Card>
      </View>

      <Card mode="elevated" style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('admin.recentOrders')}</Text>
          {pendingOrders.slice(0, 5).map((order) => (
            <View key={order.id}>
              <View style={styles.orderRow}>
                <Text variant="bodyMedium" style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
                <Text variant="bodySmall" style={{ color: '#FF9800' }}>{t(`status.${order.status}`)}</Text>
                <Text variant="bodyMedium" style={styles.orderTotal}>
                  ₹{(order.total_paise / 100).toFixed(2)}
                </Text>
              </View>
              <Divider />
            </View>
          ))}
          {pendingOrders.length === 0 && (
            <Text variant="bodyMedium" style={styles.emptyText}>{t('admin.noPendingOrders')}</Text>
          )}
        </Card.Content>
      </Card>
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
    width: '46%',
    margin: '2%',
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statLabel: {
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionCard: {
    margin: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  orderId: {
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  orderTotal: {
    fontWeight: '600',
    color: '#333333',
  },
  emptyText: {
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
