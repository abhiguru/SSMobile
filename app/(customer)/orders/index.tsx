import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Text, useTheme } from 'react-native-paper';

import { useGetOrdersQuery } from '../../../src/store/apiSlice';
import { formatPrice } from '../../../src/constants';
import { colors, spacing } from '../../../src/constants/theme';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { LoadingScreen } from '../../../src/components/common/LoadingScreen';
import type { AppTheme } from '../../../src/theme';

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery();

  const getOrderDisplayNumber = (order: Order) => {
    if (order.order_number) return order.order_number;
    return `#${(order.id ?? '').slice(0, 8).toUpperCase()}`;
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <Card mode="elevated" style={styles.orderCard} onPress={() => router.push(`/(customer)/orders/${item.id}`)}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <Text variant="titleSmall">{t('orders.orderNumber', { id: getOrderDisplayNumber(item) })}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text variant="bodySmall" style={styles.orderDate}>{t('orders.placedOn')}: {new Date(item.created_at).toLocaleDateString()}</Text>
        <View style={styles.orderFooter}>
          <Text variant="bodySmall" style={styles.itemCount}>{t('orders.items', { count: item.items?.length ?? 0 })}</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(item.total_paise)}</Text>
        </View>
        {item.status === 'out_for_delivery' && item.delivery_otp && (
          <View style={styles.otpContainer}>
            <Text variant="bodySmall" style={styles.otpLabel}>{t('orders.deliveryOtp')}:</Text>
            <Text variant="titleLarge" style={styles.otpCode}>{item.delivery_otp}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (isLoading && orders.length === 0) return <LoadingScreen />;
  if (orders.length === 0) return <EmptyState icon="package-variant" title={t('orders.empty')} />;

  return (
    <View style={styles.container}>
      <FlashList data={orders} renderItem={renderOrder} keyExtractor={(item, index) => item.id ?? `order-${index}`} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  listContent: { padding: spacing.md },
  orderCard: { marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderDate: { color: colors.text.secondary, marginBottom: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCount: { color: colors.text.secondary },
  otpContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border.light },
  otpLabel: { color: colors.text.secondary, marginRight: spacing.sm },
  otpCode: { fontWeight: 'bold', color: colors.success, letterSpacing: 2 },
});
