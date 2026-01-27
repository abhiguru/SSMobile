import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, Divider, useTheme } from 'react-native-paper';

import { useGetOrdersQuery } from '../../src/store/apiSlice';
import { formatPrice } from '../../src/constants';
import { colors, spacing } from '../../src/constants/theme';
import { Order } from '../../src/types';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { EmptyState } from '../../src/components/common/EmptyState';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';
import type { AppTheme } from '../../src/theme';

export default function DeliveryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();
  const activeDeliveries = orders.filter((o) => o.status === 'out_for_delivery');

  const renderOrder = ({ item }: { item: Order }) => (
    <Card mode="elevated" style={styles.orderCard} onPress={() => router.push(`/(delivery)/${item.id}`)}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <Text variant="titleSmall" style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Divider style={styles.divider} />
        <View style={styles.addressRow}>
          <Text variant="labelSmall" style={styles.addressLabel}>{t('delivery.deliverTo')}</Text>
          <Text variant="bodyMedium" numberOfLines={2} style={styles.addressText}>{item.delivery_address}</Text>
        </View>
        {item.delivery_pincode && (
          <Text variant="bodySmall" style={styles.pincode}>{t('common.pincode')}: {item.delivery_pincode}</Text>
        )}
        <View style={styles.orderFooter}>
          <Text variant="bodySmall" style={styles.itemCount}>{item.items.length} items</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(item.total_paise)}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading && orders.length === 0) return <LoadingScreen />;
  if (activeDeliveries.length === 0) return <EmptyState icon="truck-check" title={t('delivery.noActiveDeliveries')} />;

  return (
    <View style={styles.container}>
      <FlashList data={activeDeliveries} renderItem={renderOrder} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  listContent: { padding: spacing.md },
  orderCard: { marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontWeight: 'bold', color: colors.text.primary },
  divider: { marginBottom: 12 },
  addressRow: { marginBottom: spacing.sm },
  addressLabel: { color: colors.text.muted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  addressText: { color: colors.text.primary },
  pincode: { color: colors.text.secondary, marginBottom: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 12 },
  itemCount: { color: colors.text.secondary },
});
