import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetOrdersQuery } from '../../src/store/apiSlice';
import { formatPrice } from '../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { Order } from '../../src/types';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { EmptyState } from '../../src/components/common/EmptyState';
import { SkeletonBox, SkeletonText } from '../../src/components/common/SkeletonLoader';
import { useAppTheme } from '../../src/theme/useAppTheme';

function HistorySkeleton() {
  return (
    <View style={{ padding: spacing.lg }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonText lines={1} width="40%" />
          <SkeletonBox width={80} height={24} borderRadius={borderRadius.lg} style={{ marginTop: spacing.sm }} />
          <SkeletonText lines={1} width="25%" style={{ marginTop: spacing.sm }} />
        </View>
      ))}
    </View>
  );
}

export default function DeliveryHistoryScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { appColors } = theme;
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();
  const history = orders.filter(
    (o) => o.status === 'delivered' || o.status === 'delivery_failed'
  );

  const STATUS_STRIPE_COLORS: Record<string, string> = {
    delivered: appColors.positive,
    delivery_failed: appColors.negative,
  };

  const renderOrder = ({ item, index }: { item: Order; index: number }) => {
    const stripeColor = STATUS_STRIPE_COLORS[item.status] || appColors.positive;

    return (
      <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
        <View style={[styles.orderCard, { backgroundColor: appColors.surface, borderColor: appColors.border }]}>
          <View style={[styles.statusStripe, { backgroundColor: stripeColor }]} />
          <View style={styles.orderContent}>
            <View style={styles.orderHeader}>
              <Text variant="titleSmall" style={[styles.orderId, { color: appColors.text.primary }]}>#{item.id.slice(0, 8)}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{new Date(item.created_at).toLocaleDateString()}</Text>
            <View style={styles.orderFooter}>
              <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{item.items?.length ?? 0} items</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary, fontFamily: fontFamily.bold }}>{formatPrice(item.total_paise)}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (isLoading && orders.length === 0) return <HistorySkeleton />;
  if (history.length === 0) return <EmptyState icon="history" title={t('delivery.noHistory')} />;

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <FlashList
        data={history}
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
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skeletonCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: 12 },
});
