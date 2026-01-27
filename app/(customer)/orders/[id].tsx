import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Button, Divider, ActivityIndicator, useTheme } from 'react-native-paper';

import { useGetOrderByIdQuery, useReorderMutation } from '../../../src/store/apiSlice';
import { formatPrice } from '../../../src/constants';
import { colors, spacing, borderRadius, fontSize } from '../../../src/constants/theme';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import type { AppTheme } from '../../../src/theme';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: order, isLoading } = useGetOrderByIdQuery(id!, { skip: !id });
  const [reorder, { isLoading: reorderLoading }] = useReorderMutation();

  const handleReorder = async () => {
    if (!id) return;
    try { await reorder(id).unwrap(); router.replace('/(customer)/orders'); } catch { /* handled by RTK Query */ }
  };

  const getOrderDisplayNumber = (o: Order) => o.order_number || `#${(o.id ?? '').slice(0, 8).toUpperCase()}`;

  const getDeliveryAddress = (o: Order) => {
    if (o.shipping_address_line1) {
      return [o.shipping_address_line1, o.shipping_address_line2, o.shipping_city, o.shipping_state].filter(Boolean).join(', ');
    }
    return o.delivery_address || '';
  };

  const getDeliveryPincode = (o: Order) => o.shipping_pincode || o.delivery_pincode || '';

  if (isLoading || !order) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  const statusSteps = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const subtotal = order.subtotal_paise ?? (order.items ?? []).reduce((sum, item) => sum + (item.total_paise || item.unit_price_paise * item.quantity), 0);
  const shipping = order.shipping_paise ?? 0;
  const hasShippingBreakdown = order.subtotal_paise !== undefined;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.orderId}>{t('orders.orderNumber', { id: getOrderDisplayNumber(order) })}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text variant="bodySmall" style={styles.date}>{new Date(order.created_at).toLocaleString()}</Text>
      </View>

      {order.status !== 'cancelled' && order.status !== 'delivery_failed' && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('orders.trackOrder')}</Text>
          <View style={styles.timeline}>
            {statusSteps.map((step, index) => (
              <View key={step} style={styles.timelineStep}>
                <View style={[styles.timelineDot, index <= currentStepIndex && styles.timelineDotActive]} />
                {index < statusSteps.length - 1 && <View style={[styles.timelineLine, index < currentStepIndex && styles.timelineLineActive]} />}
                <Text variant="labelSmall" style={[styles.timelineLabel, index <= currentStepIndex && styles.timelineLabelActive]}>{t(`status.${step}`)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {order.status === 'out_for_delivery' && order.delivery_otp && (
        <View style={styles.otpSection}>
          <Text variant="bodyMedium" style={styles.otpLabel}>{t('orders.deliveryOtp')}</Text>
          <Text variant="displaySmall" style={styles.otpCode}>{order.delivery_otp}</Text>
          <Text variant="bodySmall" style={styles.otpHint}>{t('orders.shareOtpHint')}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('orders.itemsTitle')}</Text>
        {(order.items ?? []).map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text variant="bodyMedium" style={styles.itemName}>{item.product_name}</Text>
              <Text variant="bodySmall" style={styles.itemWeight}>{item.weight_label || `${item.weight_grams}g`}</Text>
            </View>
            <Text variant="bodyMedium" style={styles.itemQty}>x{item.quantity}</Text>
            <Text variant="bodyMedium" style={styles.itemPrice}>{formatPrice(item.total_paise || item.unit_price_paise * item.quantity)}</Text>
          </View>
        ))}
        {hasShippingBreakdown && (
          <>
            <View style={styles.breakdownRow}>
              <Text variant="bodyMedium" style={styles.breakdownLabel}>{t('checkout.subtotal')}</Text>
              <Text variant="bodyMedium">{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text variant="bodyMedium" style={styles.breakdownLabel}>{t('checkout.shipping')}</Text>
              {shipping === 0 ? <Text variant="bodyMedium" style={{ color: theme.custom.success, fontWeight: '600' }}>{t('checkout.free')}</Text> : <Text variant="bodyMedium">{formatPrice(shipping)}</Text>}
            </View>
          </>
        )}
        <Divider style={styles.totalDivider} />
        <View style={styles.totalRow}>
          <Text variant="titleSmall">{t('cart.total')}</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(order.total_paise)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
        {order.shipping_full_name && <Text variant="bodyMedium" style={styles.addressName}>{order.shipping_full_name}</Text>}
        <Text variant="bodyMedium" style={styles.address}>{getDeliveryAddress(order)}</Text>
        <Text variant="bodySmall" style={styles.pincode}>{t('common.pincode')}: {getDeliveryPincode(order)}</Text>
        {order.shipping_phone && <Text variant="bodySmall" style={styles.phone}>{order.shipping_phone}</Text>}
      </View>

      {order.notes && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.orderNotes')}</Text>
          <Text variant="bodyMedium" style={styles.notes}>{order.notes}</Text>
        </View>
      )}

      {(order.status === 'delivered' || order.status === 'cancelled') && (
        <Button mode="contained" icon="refresh" onPress={handleReorder} loading={reorderLoading} disabled={reorderLoading} style={styles.reorderButton} contentStyle={styles.reorderContent} labelStyle={styles.reorderLabel}>
          {t('orders.reorder')}
        </Button>
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
  sectionTitle: { fontWeight: '600', color: colors.text.primary, marginBottom: spacing.md },
  timeline: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineStep: { alignItems: 'center', flex: 1 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.border.default },
  timelineDotActive: { backgroundColor: colors.success },
  timelineLine: { position: 'absolute', left: '50%', top: 8, width: '100%', height: 2, backgroundColor: colors.border.default, zIndex: -1 },
  timelineLineActive: { backgroundColor: colors.success },
  timelineLabel: { color: colors.text.muted, marginTop: spacing.sm, textAlign: 'center' },
  timelineLabelActive: { color: colors.text.primary, fontWeight: '500' },
  otpSection: { backgroundColor: colors.successLight, padding: 20, marginBottom: spacing.sm, alignItems: 'center' },
  otpLabel: { color: colors.text.secondary, marginBottom: spacing.sm },
  otpCode: { fontWeight: 'bold', color: colors.success, letterSpacing: 8, marginBottom: spacing.sm },
  otpHint: { color: colors.text.secondary },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: '500', color: colors.text.primary },
  itemWeight: { color: colors.text.secondary },
  itemQty: { color: colors.text.secondary, marginHorizontal: spacing.md },
  itemPrice: { fontWeight: '600', color: colors.text.primary },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  breakdownLabel: { color: colors.text.secondary },
  totalDivider: { marginTop: spacing.sm, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addressName: { fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  address: { color: colors.text.primary, lineHeight: 20 },
  pincode: { color: colors.text.secondary, marginTop: spacing.xs },
  phone: { color: colors.text.secondary, marginTop: spacing.xs },
  notes: { color: colors.text.secondary, fontStyle: 'italic' },
  reorderButton: { margin: spacing.md, borderRadius: borderRadius.md },
  reorderContent: { paddingVertical: spacing.sm },
  reorderLabel: { fontSize: fontSize.xl, fontWeight: '600' },
});
