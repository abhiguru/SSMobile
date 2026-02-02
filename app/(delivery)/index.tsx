import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Divider } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetOrdersQuery } from '../../src/store/apiSlice';
import { formatPrice } from '../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { Order } from '../../src/types';
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
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();
  // Filter to show only in-house deliveries (exclude Porter deliveries)
  const activeDeliveries = orders.filter(
    (o) => o.status === 'out_for_delivery' && o.delivery_type !== 'porter'
  );

  const renderOrder = ({ item, index }: { item: Order; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 60).duration(400)}>
      <AnimatedPressable
        onPress={() => router.push(`/(delivery)/${item.id}`)}
        style={[styles.orderCard, { backgroundColor: appColors.surface, borderColor: appColors.border }]}
      >
        <View style={[styles.statusStripe, { backgroundColor: appColors.informative }]} />
        <View style={styles.orderContent}>
          <View style={styles.orderHeader}>
            <Text variant="titleSmall" style={[styles.orderId, { color: appColors.text.primary }]}>#{item.id.slice(0, 8)}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Divider style={styles.divider} />
          <View style={styles.addressRow}>
            <Text variant="labelSmall" style={[styles.addressLabel, { color: appColors.neutral }]}>{t('delivery.deliverTo')}</Text>
            <Text variant="bodyMedium" numberOfLines={2} style={{ color: appColors.text.primary }}>{item.delivery_address}</Text>
          </View>
          {item.delivery_pincode && (
            <Text variant="bodySmall" style={[styles.pincode, { color: appColors.text.secondary }]}>{t('common.pincode')}: {item.delivery_pincode}</Text>
          )}
          <View style={[styles.orderFooter, { borderTopColor: appColors.border }]}>
            <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{item.items?.length ?? 0} items</Text>
            <Text variant="titleMedium" style={{ color: theme.colors.primary, fontFamily: fontFamily.bold }}>{formatPrice(item.total_paise)}</Text>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );

  if (isLoading && orders.length === 0) return <DeliverySkeleton />;
  if (activeDeliveries.length === 0) return <EmptyState icon="truck-check" title={t('delivery.noActiveDeliveries')} />;

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <FlashList
        data={activeDeliveries}
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
  divider: { marginBottom: 12 },
  addressRow: { marginBottom: spacing.sm },
  addressLabel: { marginBottom: spacing.xs, textTransform: 'uppercase' },
  pincode: { marginBottom: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
  skeletonCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: 12 },
});
