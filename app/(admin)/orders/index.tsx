import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Chip, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetOrdersQuery } from '../../../src/store/apiSlice';
import { formatPrice, ORDER_STATUS_COLORS } from '../../../src/constants';
import { colors, spacing, borderRadius, elevation, fontFamily } from '../../../src/constants/theme';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { AnimatedPressable } from '../../../src/components/common/AnimatedPressable';
import { SkeletonBox, SkeletonText } from '../../../src/components/common/SkeletonLoader';
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
  const theme = useTheme<AppTheme>();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();
  const [activeFilter, setActiveFilter] = useState<string>('all');

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
              <Text variant="titleMedium" style={{ color: theme.colors.primary, fontFamily: fontFamily.bold }}>{formatPrice(item.total_paise)}</Text>
            </View>
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  if (isLoading && orders.length === 0) return <OrdersSkeleton />;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <Chip
              key={filter.key}
              icon={filter.icon}
              selected={isActive}
              onPress={() => setActiveFilter(filter.key)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              textStyle={isActive ? styles.filterChipTextActive : undefined}
              showSelectedOverlay={false}
            >
              {filter.key === 'all' ? t('admin.allOrders') : t(`status.${filter.key}`)}
            </Chip>
          );
        })}
      </ScrollView>
      <Text variant="bodySmall" style={styles.showingCount}>{t('admin.showingOrders', { count: filteredOrders.length })}</Text>
      <FlashList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={isFetching}
        onRefresh={refetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  chipContainer: { paddingHorizontal: 12, paddingVertical: 12, gap: spacing.sm },
  filterChip: { marginRight: spacing.xs },
  filterChipActive: { backgroundColor: colors.brand },
  filterChipTextActive: { color: colors.text.inverse },
  showingCount: { color: colors.text.secondary, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  listContent: { padding: spacing.lg },
  orderCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...elevation.level2 },
  statusStripe: { width: 4 },
  orderContent: { flex: 1, padding: spacing.lg },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontFamily: fontFamily.semiBold, color: colors.text.primary },
  orderDate: { color: colors.text.secondary, marginBottom: spacing.xs },
  orderAddress: { color: colors.text.primary, marginBottom: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  itemCount: { color: colors.text.secondary },
  skeletonCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: 12 },
});
