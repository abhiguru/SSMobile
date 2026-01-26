import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';

import { useGetOrdersQuery } from '../../../src/store/apiSlice';
import { formatPrice } from '../../../src/constants';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import type { AppTheme } from '../../../src/theme';

export default function AdminOrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();

  const renderOrder = ({ item }: { item: Order }) => (
    <Card mode="elevated" style={styles.orderCard} onPress={() => router.push(`/(admin)/orders/${item.id}`)}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <Text variant="titleSmall" style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text variant="bodySmall" style={styles.orderDate}>{new Date(item.created_at).toLocaleString()}</Text>
        <Text variant="bodyMedium" numberOfLines={1} style={styles.orderAddress}>{item.delivery_address}</Text>
        <View style={styles.orderFooter}>
          <Text variant="bodySmall" style={styles.itemCount}>{item.items.length} items</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(item.total_paise)}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading && orders.length === 0) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);
  }

  return (
    <View style={styles.container}>
      <FlatList data={orders} renderItem={renderOrder} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  orderCard: { marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontWeight: 'bold', color: '#333333' },
  orderDate: { color: '#666666', marginBottom: 4 },
  orderAddress: { color: '#333333', marginBottom: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 12 },
  itemCount: { color: '#666666' },
});
