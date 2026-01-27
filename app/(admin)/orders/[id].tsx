import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Button, Divider, ActivityIndicator, useTheme } from 'react-native-paper';

import { useGetOrderByIdQuery, useUpdateOrderStatusMutation } from '../../../src/store/apiSlice';
import { formatPrice } from '../../../src/constants';
import { colors, spacing } from '../../../src/constants/theme';
import { OrderStatus } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import type { AppTheme } from '../../../src/theme';

const STATUS_ACTIONS: Record<string, OrderStatus[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'delivery_failed'],
};

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme<AppTheme>();
  const { data: order, isLoading } = useGetOrderByIdQuery(id!, { skip: !id });
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const handleStatusUpdate = (newStatus: OrderStatus) => {
    Alert.alert(t('admin.confirmStatusUpdate'), t('admin.updateStatusTo', { status: t(`status.${newStatus}`) }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: () => { if (id) updateOrderStatus({ orderId: id, status: newStatus }); } },
    ]);
  };

  if (isLoading || !order) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);
  }

  const availableActions = STATUS_ACTIONS[order.status] || [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text variant="bodySmall" style={styles.date}>{new Date(order.created_at).toLocaleString()}</Text>
      </View>

      {availableActions.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('admin.updateStatus')}</Text>
          <View style={styles.actionsRow}>
            {availableActions.map((status) => {
              const isDanger = status === 'cancelled' || status === 'delivery_failed';
              return (<Button key={status} mode="contained" buttonColor={isDanger ? theme.colors.error : theme.custom.success} onPress={() => handleStatusUpdate(status)} style={styles.actionButton}>{t(`status.${status}`)}</Button>);
            })}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
        <Text variant="bodyMedium" style={styles.address}>{order.delivery_address}</Text>
        <Text variant="bodySmall" style={styles.pincode}>{t('common.pincode')}: {order.delivery_pincode}</Text>
      </View>

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('admin.orderItems')}</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text variant="bodyMedium" style={styles.itemName}>{item.product_name}</Text>
              <Text variant="bodySmall" style={styles.itemWeight}>{item.weight_grams}g</Text>
            </View>
            <Text variant="bodyMedium" style={styles.itemQty}>x{item.quantity}</Text>
            <Text variant="bodyMedium" style={styles.itemPrice}>{formatPrice(item.total_paise || item.unit_price_paise * item.quantity)}</Text>
          </View>
        ))}
        <Divider style={styles.totalDivider} />
        <View style={styles.totalRow}>
          <Text variant="titleSmall">{t('cart.total')}</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(order.total_paise)}</Text>
        </View>
      </View>

      {order.notes && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.orderNotes')}</Text>
          <Text variant="bodyMedium" style={styles.notes}>{order.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: colors.background.primary, padding: spacing.md, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontWeight: 'bold', color: colors.text.primary },
  date: { color: colors.text.secondary },
  sectionTitle: { fontWeight: '600', color: colors.text.primary, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1 },
  address: { color: colors.text.primary, lineHeight: 20 },
  pincode: { color: colors.text.secondary, marginTop: spacing.xs },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: '500', color: colors.text.primary },
  itemWeight: { color: colors.text.secondary },
  itemQty: { color: colors.text.secondary, marginHorizontal: spacing.md },
  itemPrice: { fontWeight: '600', color: colors.text.primary },
  totalDivider: { marginTop: spacing.sm, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notes: { color: colors.text.secondary, fontStyle: 'italic' },
});
