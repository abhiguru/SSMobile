import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Card, Text, useTheme } from 'react-native-paper';

import { useGetOrdersQuery } from '../../src/store/apiSlice';
import { formatPrice } from '../../src/constants';
import { colors, spacing } from '../../src/constants/theme';
import { Order } from '../../src/types';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { EmptyState } from '../../src/components/common/EmptyState';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';
import type { AppTheme } from '../../src/theme';

export default function DeliveryHistoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme<AppTheme>();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();
  const history = orders.filter((o) => o.status === 'delivered' || o.status === 'delivery_failed');

  const renderOrder = ({ item }: { item: Order }) => (
    <Card mode="elevated" style={styles.orderCard}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <Text variant="titleSmall" style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text variant="bodySmall" style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        <View style={styles.orderFooter}>
          <Text variant="bodySmall" style={styles.itemCount}>{item.items.length} items</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(item.total_paise)}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading && orders.length === 0) return <LoadingScreen />;
  if (history.length === 0) return <EmptyState icon="history" title={t('delivery.noHistory')} />;

  return (
    <View style={styles.container}>
      <FlashList data={history} renderItem={renderOrder} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  listContent: { padding: spacing.md },
  orderCard: { marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontWeight: 'bold', color: colors.text.primary },
  orderDate: { color: colors.text.secondary, marginBottom: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCount: { color: colors.text.secondary },
});
