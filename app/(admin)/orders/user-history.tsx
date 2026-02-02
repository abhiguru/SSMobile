import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useGetOrdersByUserQuery } from '../../../src/store/apiSlice';
import { formatPrice, getOrderStatusColor } from '../../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme/useAppTheme';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { AnimatedPressable } from '../../../src/components/common/AnimatedPressable';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { LoadingScreen } from '../../../src/components/common/LoadingScreen';

export default function UserOrderHistoryScreen() {
  const { userId, userName } = useLocalSearchParams<{ userId: string; userName?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { appColors } = useAppTheme();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersByUserQuery(userId!, {
    skip: !userId,
  });

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

  const title = userName
    ? t('admin.userOrderHistory', { name: userName })
    : t('admin.orders');

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: appColors.shell }]}>
      <Stack.Screen options={{ title }} />
      <FlashList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={isFetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState
            icon="package-variant"
            title={t('orders.empty')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  orderCard: { flexDirection: 'row', borderRadius: borderRadius.lg, marginBottom: spacing.md, overflow: 'hidden', borderWidth: 1, ...elevation.level2 },
  statusStripe: { width: 4 },
  orderContent: { flex: 1, padding: spacing.lg },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontFamily: fontFamily.semiBold },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: spacing.md },
  orderPrice: { fontFamily: fontFamily.bold },
});
