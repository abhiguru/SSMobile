import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Chip } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetOrdersRpcQuery, useReorderMutation } from '../../../src/store/apiSlice';
import { addNotificationListener } from '../../../src/services/notifications';
import { hapticLight, hapticSuccess, hapticError } from '../../../src/utils/haptics';
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

// #27: Order status progress mapping (0-3 for visual timeline)
const STATUS_PROGRESS: Record<OrderStatus, number> = {
  placed: 0,
  confirmed: 1,
  out_for_delivery: 2,
  delivered: 3,
  cancelled: -1,
  delivery_failed: -1,
};

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { appColors } = useAppTheme();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  // Poll every 10s to keep status bars current (push notifications unavailable in Expo Go)
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersRpcQuery(
    statusFilter ? { status: statusFilter } : undefined,
    { pollingInterval: 10_000, refetchOnMountOrArgChange: true }
  );
  const [reorder, { isLoading: isReordering }] = useReorderMutation();
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);

  // Refetch immediately when a foreground notification arrives
  useEffect(() => {
    console.log('[OrdersScreen] registering notification listener');
    const sub = addNotificationListener((notification) => {
      const data = notification.request.content.data as Record<string, string> | undefined;
      console.log('[OrdersScreen:notification] received — title:', notification.request.content.title);
      console.log('[OrdersScreen:notification] data:', JSON.stringify(data));
      console.log('[OrdersScreen:notification] current orders count:', orders.length, 'statuses:', orders.map((o) => `${o.order_number}:${o.status}`).join(', '));
      console.log('[OrdersScreen:notification] calling refetch()...');
      refetch()
        .then((result) => {
          console.log('[OrdersScreen:notification] refetch completed — status:', result.status);
          if (result.data) {
            console.log('[OrdersScreen:notification] new orders count:', result.data.length, 'statuses:', result.data.map((o: OrderSummary) => `${o.order_number}:${o.status}`).join(', '));
          }
        })
        .catch((err) => {
          console.log('[OrdersScreen:notification] refetch error:', err);
        });
    });
    return () => {
      console.log('[OrdersScreen] removing notification listener');
      sub.remove();
    };
  }, [refetch, orders]);

  // #3: One-tap reorder handler
  const handleReorder = useCallback(async (orderId: string) => {
    hapticLight();
    setReorderingOrderId(orderId);
    try {
      await reorder(orderId).unwrap();
      hapticSuccess();
      router.push('/(customer)/cart');
    } catch {
      hapticError();
    } finally {
      setReorderingOrderId(null);
    }
  }, [reorder, t, router]);

  const getOrderDisplayNumber = (order: OrderSummary) => {
    if (order.order_number) return order.order_number;
    return `#${(order.id ?? '').slice(0, 8).toUpperCase()}`;
  };

  const renderOrder = ({ item, index }: { item: OrderSummary; index: number }) => {
    const stripeColor = getOrderStatusColor(item.status, appColors);
    const progress = STATUS_PROGRESS[item.status];
    const isDelivered = item.status === 'delivered';
    const isCancelled = item.status === 'cancelled' || item.status === 'delivery_failed';
    const isReorderingThis = reorderingOrderId === item.id;

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

            {/* #27: Mini-timeline progress indicator */}
            {!isCancelled && (
              <View style={styles.miniTimeline}>
                {[0, 1, 2, 3].map((step) => (
                  <View key={step} style={styles.timelineStep}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: step <= progress ? appColors.positive : appColors.neutralLight,
                        },
                      ]}
                    />
                    {step < 3 && (
                      <View
                        style={[
                          styles.timelineLine,
                          {
                            backgroundColor: step < progress ? appColors.positive : appColors.neutralLight,
                          },
                        ]}
                      />
                    )}
                  </View>
                ))}
              </View>
            )}

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

            {/* #3: One-tap reorder button for delivered orders */}
            {isDelivered && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleReorder(item.id);
                }}
                disabled={isReordering}
                style={[styles.reorderButton, { borderColor: appColors.brand }]}
              >
                {isReorderingThis ? (
                  <Text variant="labelMedium" style={{ color: appColors.brand }}>{t('common.loading')}</Text>
                ) : (
                  <>
                    <MaterialCommunityIcons name="repeat" size={16} color={appColors.brand} />
                    <Text variant="labelMedium" style={[styles.reorderText, { color: appColors.brand }]}>{t('orders.reorder')}</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={16} color={appColors.neutral} style={{ alignSelf: 'center', marginRight: spacing.sm }} />
        </AnimatedPressable>
      </Animated.View>
    );
  };

  const renderFilterChips = () => (
    <View style={styles.filterWrapper}>
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
              compact
              style={[
                styles.filterChip,
                { backgroundColor: isSelected ? appColors.brand : appColors.surface },
              ]}
              textStyle={[styles.filterChipText, { color: isSelected ? appColors.text.inverse : appColors.text.primary }]}
            >
              {t(filter.labelKey)}
            </Chip>
          );
        })}
      </ScrollView>
    </View>
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
  filterWrapper: {},
  filterContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  filterChip: { marginRight: spacing.xs },
  filterChipText: { fontSize: 12 },
  listContent: { padding: spacing.lg },
  orderCard: { flexDirection: 'row', borderRadius: borderRadius.md, marginBottom: spacing.sm, overflow: 'hidden', borderWidth: 1 },
  statusStripe: { width: 4 },
  orderContent: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  orderId: { fontFamily: fontFamily.semiBold },
  orderDate: { marginBottom: spacing.xs },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  otpContainer: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1 },
  otpLabel: { marginRight: spacing.sm },
  otpCode: { fontFamily: fontFamily.bold, letterSpacing: 2 },
  skeletonCard: { borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  // #27: Mini-timeline styles
  miniTimeline: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.sm },
  timelineStep: { flexDirection: 'row', alignItems: 'center' },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  timelineLine: { width: 24, height: 2, marginHorizontal: 2 },
  // #3: Reorder button styles
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  reorderText: { marginLeft: spacing.xs, fontFamily: fontFamily.semiBold },
});
