import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetOrdersQuery } from '../../../src/store/apiSlice';
import { formatPrice, ORDER_STATUS_COLORS } from '../../../src/constants';
import { colors, spacing, borderRadius, elevation, fontFamily, fontSize } from '../../../src/constants/theme';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { AnimatedPressable } from '../../../src/components/common/AnimatedPressable';
import { SkeletonBox, SkeletonText } from '../../../src/components/common/SkeletonLoader';

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

// Fiori tag-spec colors (spec 18) for semantic filter pills
const PILL_COLORS: Record<string, { bg: string; text: string }> = {
  all: { bg: colors.brand, text: colors.text.inverse },
  placed: { bg: '#FEF7F1', text: '#AA5808' },
  confirmed: { bg: '#EBF8FF', text: '#0040B0' },
  out_for_delivery: { bg: '#EBF8FF', text: '#0040B0' },
  delivered: { bg: '#F5FAE5', text: '#256F14' },
  cancelled: { bg: '#FFF4F2', text: '#AA161F' },
  delivery_failed: { bg: '#FFF4F2', text: '#AA161F' },
};

function OrdersSkeleton() {
  return (
    <View style={{ padding: spacing.lg }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
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
    const stripeColor = ORDER_STATUS_COLORS[item.status] || colors.critical;

    return (
      <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
        <AnimatedPressable
          onPress={() => router.push(`/(admin)/orders/${item.id}`)}
          style={styles.orderCard}
        >
          <View style={[styles.statusStripe, { backgroundColor: stripeColor }]} />
          <View style={styles.orderContent}>
            <View style={styles.orderHeader}>
              <Text variant="titleSmall" style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text variant="bodySmall" style={styles.orderDate}>{new Date(item.created_at).toLocaleString()}</Text>
            <Text variant="bodyMedium" numberOfLines={1} style={styles.orderAddress}>{item.delivery_address}</Text>
            <View style={styles.orderFooter}>
              <Text variant="bodySmall" style={styles.itemCount}>{item.items?.length ?? 0} items</Text>
              <Text variant="titleMedium" style={styles.orderPrice}>{formatPrice(item.total_paise)}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.neutral} style={{ alignSelf: 'center', marginRight: spacing.sm }} />
        </AnimatedPressable>
      </Animated.View>
    );
  };

  if (isLoading && orders.length === 0) return <OrdersSkeleton />;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={styles.pillRow}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          const count = statusCounts[filter] || 0;
          const pillColor = PILL_COLORS[filter];
          return (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={({ pressed }) => [
                styles.pill,
                isActive
                  ? { backgroundColor: pressed ? colors.brandDark : pillColor.bg }
                  : { backgroundColor: pressed ? colors.neutralLight : colors.fieldBackground },
              ]}
            >
              <Text style={[styles.pillLabel, { color: isActive ? pillColor.text : colors.text.secondary }]}>
                {t(FILTER_LABEL_KEYS[filter])}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.pillCount,
                    { backgroundColor: isActive ? pillColor.text : colors.neutralLight },
                  ]}
                >
                  <Text style={[styles.pillCountText, { color: isActive ? colors.text.inverse : colors.text.secondary }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.listWrapper}>
        <FlashList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  pillScroll: { flexGrow: 0 },
  listWrapper: { flex: 1 },
  pillRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    gap: spacing.xs,
  },
  pillLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
  },
  pillCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  pillCountText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  orderCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginBottom: spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...elevation.level2 },
  statusStripe: { width: 4 },
  orderContent: { flex: 1, padding: spacing.lg },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontFamily: fontFamily.semiBold, color: colors.text.primary },
  orderDate: { color: colors.text.secondary, marginBottom: spacing.xs },
  orderAddress: { color: colors.text.primary, marginBottom: spacing.md },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  orderPrice: { color: colors.brand, fontFamily: fontFamily.bold },
  itemCount: { color: colors.text.secondary },
  skeletonCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
});
