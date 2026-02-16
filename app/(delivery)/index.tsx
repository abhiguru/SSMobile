import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetOrdersRpcQuery } from '../../src/store/apiSlice';
import { addNotificationListener } from '../../src/services/notifications';
import { selectIsAuthenticated } from '../../src/store/slices/authSlice';
import { useAppSelector } from '../../src/store';
import { formatPrice } from '../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { OrderSummary } from '../../src/types';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { EmptyState } from '../../src/components/common/EmptyState';
import { AnimatedPressable } from '../../src/components/common/AnimatedPressable';
import { SkeletonBox, SkeletonText } from '../../src/components/common/SkeletonLoader';
import { useAppTheme } from '../../src/theme/useAppTheme';

function DeliverySkeleton() {
  return (
    <View style={{ padding: spacing.lg }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonText lines={1} width="50%" />
          <SkeletonBox width={80} height={24} borderRadius={borderRadius.lg} style={{ marginTop: spacing.sm }} />
          <SkeletonText lines={2} style={{ marginTop: spacing.sm }} />
        </View>
      ))}
    </View>
  );
}

export default function DeliveryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useAppTheme();
  const { appColors } = theme;
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersRpcQuery(
    { status: 'out_for_delivery' },
    { pollingInterval: 10_000, refetchOnMountOrArgChange: true, skip: !isAuthenticated }
  );

  // Refetch immediately when a foreground notification arrives
  useEffect(() => {
    const sub = addNotificationListener(() => {
      refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  const renderOrder = ({ item, index }: { item: OrderSummary; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
      <AnimatedPressable
        onPress={() => router.push(`/(delivery)/${item.id}`)}
        style={[styles.orderCard, { backgroundColor: appColors.surface, borderColor: appColors.border }]}
      >
        <View style={[styles.statusStripe, { backgroundColor: appColors.informative }]} />
        <View style={styles.orderContent}>
          <View style={styles.orderHeader}>
            <Text variant="titleSmall" style={[styles.orderId, { color: appColors.text.primary }]}>#{item.order_number || item.id.slice(0, 8)}</Text>
            <StatusBadge status={item.status} />
          </View>
          <View style={[styles.orderFooter, { borderTopColor: appColors.border }]}>
            <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{item.item_count} items</Text>
            <Text variant="titleMedium" style={{ color: theme.colors.primary, fontFamily: fontFamily.bold }}>{formatPrice(item.total_paise)}</Text>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );

  if (isLoading && orders.length === 0) return <DeliverySkeleton />;
  if (orders.length === 0) return <EmptyState icon="truck-check" title={t('delivery.noActiveDeliveries')} />;

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <FlashList
        data={orders}
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
  container: { flex: 1 },
  listContent: { padding: spacing.lg },
  orderCard: { flexDirection: 'row', borderRadius: borderRadius.lg, marginBottom: 12, overflow: 'hidden', borderWidth: 1, ...elevation.level2 },
  statusStripe: { width: 4 },
  orderContent: { flex: 1, padding: spacing.lg },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontFamily: fontFamily.semiBold },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12, marginTop: spacing.sm },
  skeletonCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: 12 },
});
