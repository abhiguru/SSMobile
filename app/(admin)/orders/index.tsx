import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetOrdersQuery } from '../../../src/store/apiSlice';
import { formatPrice, getOrderStatusColor } from '../../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme/useAppTheme';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { AnimatedPressable } from '../../../src/components/common/AnimatedPressable';
import { SkeletonBox, SkeletonText } from '../../../src/components/common/SkeletonLoader';
import { FioriChip } from '../../../src/components/common/FioriChip';

const STATUS_FILTERS = [
  'all', 'placed', 'confirmed', 'out_for_delivery',
  'delivered', 'cancelled', 'delivery_failed',
] as const;

const FILTER_LABEL_KEYS: Record<string, string> = {
  all: 'admin.filterAll',
  placed: 'admin.filterPlaced',
  confirmed: 'admin.filterConfirmed',
  out_for_delivery: 'admin.filterOutForDelivery',
  delivered: 'admin.filterDelivered',
  cancelled: 'admin.filterCancelled',
  delivery_failed: 'admin.filterFailed',
};

function OrdersSkeleton() {
  return (
    <View style={{ padding: spacing.lg }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.skeletonCardLayout}>
          <SkeletonText lines={1} width="40%" />
          <SkeletonBox width={80} height={24} borderRadius={borderRadius.lg} style={{ marginTop: spacing.sm }} />
          <SkeletonText lines={1} width="70%" style={{ marginTop: spacing.sm }} />
        </View>
      ))}
    </View>
  );
}

export default function AdminOrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { appColors } = useAppTheme();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  const renderOrder = ({ item, index }: { item: Order; index: number }) => {
    const stripeColor = getOrderStatusColor(item.status, appColors);

    return (
      <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
        <AnimatedPressable
          onPress={() => router.push(`/(admin)/orders/${item.id}`)}
          style={[styles.orderCard, { backgroundColor: appColors.surface, borderColor: appColors.border }]}
        >
          <View style={[styles.statusStripe, { backgroundColor: stripeColor }]} />
          <View style={styles.orderContent}>
            <View style={styles.orderHeader}>
              <Text variant="titleSmall" style={[styles.orderId, { color: appColors.text.primary }]}>#{item.id.slice(0, 8)}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{new Date(item.created_at).toLocaleString()}</Text>
            <Text variant="bodyMedium" numberOfLines={1} style={{ color: appColors.text.primary, marginBottom: spacing.md }}>{item.delivery_address}</Text>
            <View style={[styles.orderFooter, { borderTopColor: appColors.border }]}>
              <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{item.items?.length ?? 0} items</Text>
              <Text variant="titleMedium" style={[styles.orderPrice, { color: appColors.brand }]}>{formatPrice(item.total_paise)}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={16} color={appColors.neutral} style={{ alignSelf: 'center', marginRight: spacing.sm }} />
        </AnimatedPressable>
      </Animated.View>
    );
  };

  if (isLoading && orders.length === 0) return <OrdersSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => (
          <FioriChip
            key={filter}
            label={t(FILTER_LABEL_KEYS[filter])}
            selected={activeFilter === filter}
            count={statusCounts[filter] || 0}
            onPress={() => setActiveFilter(filter)}
          />
        ))}
      </ScrollView>
      <View style={styles.listWrapper}>
        {filteredOrders.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant-closed" size={64} color={appColors.neutral} />
            <Text variant="titleMedium" style={[styles.emptyTitle, { color: appColors.text.primary }]}>
              {activeFilter === 'all' ? t('admin.noOrdersTitle') : t('admin.noOrdersFilterTitle')}
            </Text>
            <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: appColors.text.secondary }]}>
              {activeFilter === 'all' ? t('admin.noOrdersSubtitle') : t('admin.noOrdersFilterSubtitle')}
            </Text>
            {activeFilter !== 'all' && (
              <Text
                variant="labelLarge"
                style={[styles.clearFilters, { color: appColors.brand }]}
                onPress={() => setActiveFilter('all')}
              >
                {t('admin.clearFilters')}
              </Text>
            )}
          </View>
        ) : (
          <FlashList
            data={filteredOrders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={isFetching}
            onRefresh={refetch}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterScroll: { flexGrow: 0 },
  listWrapper: { flex: 1 },
  filterRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  orderCard: { flexDirection: 'row', borderRadius: borderRadius.lg, marginBottom: spacing.md, overflow: 'hidden', borderWidth: 1, ...elevation.level2 },
  statusStripe: { width: 4 },
  orderContent: { flex: 1, padding: spacing.lg },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontFamily: fontFamily.semiBold },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: spacing.md },
  orderPrice: { fontFamily: fontFamily.bold },
  skeletonCardLayout: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fontFamily.semiBold, marginTop: spacing.lg, textAlign: 'center' },
  emptySubtitle: { marginTop: spacing.sm, textAlign: 'center' },
  clearFilters: { marginTop: spacing.lg, fontFamily: fontFamily.semiBold },
});
