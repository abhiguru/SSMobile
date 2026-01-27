import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Chip, Text, useTheme } from 'react-native-paper';

import { useGetOrdersQuery } from '../../../src/store/apiSlice';
import { formatPrice } from '../../../src/constants';
import { colors, spacing } from '../../../src/constants/theme';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { LoadingScreen } from '../../../src/components/common/LoadingScreen';
import type { AppTheme } from '../../../src/theme';

const STATUS_FILTERS = [
  { key: 'all', icon: 'filter-variant' },
  { key: 'placed', icon: 'clock-outline' },
  { key: 'confirmed', icon: 'check-circle-outline' },
  { key: 'out_for_delivery', icon: 'truck-delivery-outline' },
  { key: 'delivered', icon: 'package-variant-closed-check' },
  { key: 'cancelled', icon: 'cancel' },
  { key: 'delivery_failed', icon: 'alert-circle-outline' },
] as const;

export default function AdminOrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

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

  if (isLoading && orders.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <Chip key={filter.key} icon={filter.icon} selected={isActive} onPress={() => setActiveFilter(filter.key)} style={[styles.filterChip, isActive && styles.filterChipActive]} textStyle={isActive ? styles.filterChipTextActive : undefined} showSelectedOverlay={false}>
              {filter.key === 'all' ? t('admin.allOrders') : t(`status.${filter.key}`)}
            </Chip>
          );
        })}
      </ScrollView>
      <Text variant="bodySmall" style={styles.showingCount}>{t('admin.showingOrders', { count: filteredOrders.length })}</Text>
      <FlashList data={filteredOrders} renderItem={renderOrder} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  chipContainer: { paddingHorizontal: 12, paddingVertical: 12, gap: spacing.sm },
  filterChip: { marginRight: spacing.xs },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipTextActive: { color: colors.text.inverse },
  showingCount: { color: colors.text.secondary, paddingHorizontal: spacing.md, marginBottom: spacing.xs },
  listContent: { padding: spacing.md },
  orderCard: { marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontWeight: 'bold', color: colors.text.primary },
  orderDate: { color: colors.text.secondary, marginBottom: spacing.xs },
  orderAddress: { color: colors.text.primary, marginBottom: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 12 },
  itemCount: { color: colors.text.secondary },
});
