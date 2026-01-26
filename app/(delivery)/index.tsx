import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, Divider, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGetOrdersQuery } from '../../src/store/apiSlice';
import { formatPrice } from '../../src/constants';
import { Order } from '../../src/types';
import type { AppTheme } from '../../src/theme';

export default function DeliveriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();
  const activeDeliveries = orders.filter((o) => o.status === 'out_for_delivery');

  const renderDelivery = ({ item }: { item: Order }) => (
    <Card mode="elevated" style={styles.deliveryCard} onPress={() => router.push(`/(delivery)/${item.id}`)}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <Text variant="titleMedium" style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(item.total_paise)}</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.addressContainer}>
          <Text variant="labelSmall" style={styles.addressLabel}>Deliver to:</Text>
          <Text variant="bodyMedium" style={styles.address}>{item.delivery_address}</Text>
          <Text variant="bodySmall" style={styles.pincode}>Pincode: {item.delivery_pincode}</Text>
        </View>
        <Divider style={styles.divider} />
        <Text variant="bodySmall" style={styles.itemCount}>{item.items.length} items</Text>
      </Card.Content>
    </Card>
  );

  if (isLoading && orders.length === 0) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);
  }

  if (activeDeliveries.length === 0) {
    return (<View style={styles.emptyContainer}><MaterialCommunityIcons name="truck-delivery" size={64} color="#999999" /><Text variant="titleMedium" style={styles.emptyTitle}>{t('delivery.noDeliveries')}</Text></View>);
  }

  return (
    <View style={styles.container}>
      <FlatList data={activeDeliveries} renderItem={renderDelivery} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
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
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: 'bold', color: '#333333' },
  divider: { marginVertical: 12 },
  addressContainer: { marginBottom: 0 },
  addressLabel: { color: '#666666', marginBottom: 4 },
  address: { color: '#333333', lineHeight: 20 },
  pincode: { color: '#666666', marginTop: 4 },
  itemCount: { color: '#666666' },
});
