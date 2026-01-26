import { View, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGetOrdersQuery } from '../../src/store/apiSlice';
import { formatPrice } from '../../src/constants';
import { Order } from '../../src/types';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import type { AppTheme } from '../../src/theme';

export default function DeliveryHistoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme<AppTheme>();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();
  const completedDeliveries = orders.filter((o) => o.status === 'delivered' || o.status === 'delivery_failed');

  const renderDelivery = ({ item }: { item: Order }) => (
    <Card mode="elevated" style={styles.deliveryCard}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <Text variant="titleSmall" style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text variant="bodySmall" style={styles.date}>{new Date(item.updated_at).toLocaleString()}</Text>
        <Text variant="bodyMedium" numberOfLines={1} style={styles.address}>{item.delivery_address}</Text>
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.itemCount}>{item.items.length} items</Text>
          <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(item.total_paise)}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading && orders.length === 0) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);
  }

  if (completedDeliveries.length === 0) {
    return (<View style={styles.emptyContainer}><MaterialCommunityIcons name="clipboard-list" size={64} color="#999999" /><Text variant="titleMedium" style={styles.emptyTitle}>No delivery history</Text></View>);
  }

  return (
    <View style={styles.container}>
      <FlatList data={completedDeliveries} renderItem={renderDelivery} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { color: '#666666', marginTop: 16 },
  listContent: { padding: 16 },
  deliveryCard: { marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontWeight: 'bold', color: '#333333' },
  date: { color: '#666666', marginBottom: 8 },
  address: { color: '#333333', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCount: { color: '#666666' },
});
