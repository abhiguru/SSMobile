import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Chip } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetOrdersRpcQuery } from '../../../src/store/apiSlice';
import { formatPrice, getOrderStatusColor } from '../../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme';
import { OrderSummary, OrderStatus } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { AnimatedPressable } from '../../../src/components/common/AnimatedPressable';
import { SkeletonBox, SkeletonText } from '../../../src/components/common/SkeletonLoader';

const STATUS_FILTERS: { key: OrderStatus | null; labelKey: string }[] = [
  { key: null, labelKey: 'admin.filterAll' },
  { key: 'placed', labelKey: 'admin.filterPlaced' },
  { key: 'confirmed', labelKey: 'admin.filterConfirmed' },
  { key: 'out_for_delivery', labelKey: 'admin.filterOutForDelivery' },
  { key: 'delivered', labelKey: 'admin.filterDelivered' },
  { key: 'cancelled', labelKey: 'admin.filterCancelled' },
];

function OrdersSkeleton() {
  const { appColors } = useAppTheme();
  return (
    <View style={{ flex: 1, padding: spacing.lg, backgroundColor: appColors.shell }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: appColors.surface }]}>
          <SkeletonText lines={1} width="50%" />
          <SkeletonBox width={80} height={24} borderRadius={borderRadius.lg} style={{ marginTop: spacing.sm }} />
          <SkeletonText lines={1} width="30%" style={{ marginTop: spacing.sm }} />
        </View>
      ))}
    </View>
  );
}

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { appColors } = useAppTheme();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersRpcQuery(
    statusFilter ? { status: statusFilter } : undefined
  );

  const getOrderDisplayNumber = (order: OrderSummary) => {
    if (order.order_number) return order.order_number;
    return `#${(order.id ?? '').slice(0, 8).toUpperCase()}`;
  };

  const renderOrder = ({ item, index }: { item: OrderSummary; index: number }) => {
    const stripeColor = getOrderStatusColor(item.status, appColors);

    return (
      <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
        <AnimatedPressable
          onPress={() => router.push(`/(customer)/orders/${item.id}`)}
          style={[styles.orderCard, { backgroundColor: appColors.surface, borderColor: appColors.border }, elevation.level2]}
        >
          <View style={[styles.statusStripe, { backgroundColor: stripeColor }]} />
          <View style={styles.orderContent}>
            <View style={styles.orderHeader}>
              <Text variant="titleSmall" style={styles.orderId}>{t('orders.orderNumber', { id: getOrderDisplayNumber(item) })}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text variant="bodySmall" style={[styles.orderDate, { color: appColors.text.secondary }]}>{t('orders.placedOn')}: {new Date(item.created_at).toLocaleDateString()}</Text>
            <View style={styles.orderFooter}>
              <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{t('orders.items', { count: item.item_count ?? 0 })}</Text>
              <Text variant="titleMedium" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>{formatPrice(item.total_paise)}</Text>
            </View>
            {item.status === 'out_for_delivery' && item.delivery_otp && (
              <View style={[styles.otpContainer, { borderTopColor: appColors.border }]}>
                <Text variant="bodySmall" style={[styles.otpLabel, { color: appColors.text.secondary }]}>{t('orders.deliveryOtp')}:</Text>
                <Text variant="titleLarge" style={[styles.otpCode, { color: appColors.positive }]}>{item.delivery_otp}</Text>
              </View>
            )}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={16} color={appColors.neutral} style={{ alignSelf: 'center', marginRight: spacing.sm }} />
        </AnimatedPressable>
      </Animated.View>
    );
  };

  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterContainer}
    >
      {STATUS_FILTERS.map((filter) => {
        const isSelected = statusFilter === filter.key;
        return (
          <Chip
            key={filter.key ?? 'all'}
            selected={isSelected}
            onPress={() => setStatusFilter(filter.key)}
            style={[
              styles.filterChip,
              { backgroundColor: isSelected ? appColors.brand : appColors.surface },
            ]}
            textStyle={{ color: isSelected ? appColors.text.inverse : appColors.text.primary }}
          >
            {t(filter.labelKey)}
          </Chip>
        );
      })}
    </ScrollView>
  );

  if (isLoading && orders.length === 0) return <OrdersSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      {renderFilterChips()}
      {orders.length === 0 ? (
        <EmptyState icon="package-variant" title={t('orders.empty')} />
      ) : (
        <FlashList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item, index) => item.id ?? `order-${index}`}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  filterChip: { marginRight: spacing.sm },
  listContent: { padding: spacing.lg },
  orderCard: { flexDirection: 'row', borderRadius: borderRadius.lg, marginBottom: 12, overflow: 'hidden', borderWidth: 1 },
  statusStripe: { width: 4 },
  orderContent: { flex: 1, padding: spacing.lg },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontFamily: fontFamily.semiBold },
  orderDate: { marginBottom: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  otpContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  otpLabel: { marginRight: spacing.sm },
  otpCode: { fontFamily: fontFamily.bold, letterSpacing: 2 },
  skeletonCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: 12 },
});
