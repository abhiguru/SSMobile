import { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Divider, ActivityIndicator, Portal, Modal, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInLeft } from 'react-native-reanimated';

import { useGetOrderRpcQuery, useReorderMutation, useCancelOrderMutation, useGetOrderStatusHistoryQuery } from '../../../src/store/apiSlice';
import { formatPrice } from '../../../src/constants';
import { spacing, borderRadius, fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme';
import { Order, OrderStatusHistoryEntry } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { SectionHeader } from '../../../src/components/common/SectionHeader';
import { KeyValueRow } from '../../../src/components/common/KeyValueRow';
import { AppButton } from '../../../src/components/common/AppButton';
import { hapticSuccess, hapticError } from '../../../src/utils/haptics';
const TIMELINE_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  placed: 'clock-outline',
  confirmed: 'check-circle-outline',
  out_for_delivery: 'truck-delivery-outline',
  delivered: 'package-variant-closed-check',
  cancelled: 'close-circle-outline',
  delivery_failed: 'alert-circle-outline',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { appColors } = useAppTheme();
  const { data: order, isLoading, isFetching, refetch } = useGetOrderRpcQuery(id!, {
    skip: !id,
    pollingInterval: 15_000,
    refetchOnMountOrArgChange: true,
  });
  const { data: statusHistory = [] } = useGetOrderStatusHistoryQuery(id!, { skip: !id });
  const [reorder, { isLoading: reorderLoading }] = useReorderMutation();
  const [cancelOrder, { isLoading: cancelLoading }] = useCancelOrderMutation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const canCancel = order?.status === 'placed' || order?.status === 'confirmed';

  const handleReorder = async () => {
    if (!id) return;
    try {
      await reorder(id).unwrap();
      hapticSuccess();
      router.replace('/(customer)/orders');
    } catch { /* handled by RTK Query */ }
  };

  const handleCancelOrder = async () => {
    if (!id) return;
    try {
      await cancelOrder({ orderId: id, reason: cancelReason || undefined }).unwrap();
      hapticSuccess();
      setShowCancelModal(false);
      setCancelReason('');
      Alert.alert(t('orders.orderCancelled'));
    } catch {
      hapticError();
      Alert.alert(t('orders.cancelFailed'));
    }
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
    return <View style={[styles.centered, { backgroundColor: appColors.shell }]}><ActivityIndicator size="large" color={appColors.brand} /></View>;
  }

  const statusSteps = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const subtotal = order.subtotal_paise ?? (order.items ?? []).reduce((sum, item) => sum + (item.total_paise || item.unit_price_paise * item.quantity), 0);
  const shipping = order.shipping_paise ?? 0;
  const hasShippingBreakdown = order.subtotal_paise !== undefined;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: appColors.shell }]}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={appColors.brand} colors={[appColors.brand]} />}
    >
      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={[styles.orderId, { color: appColors.text.primary }]}>{t('orders.orderNumber', { id: getOrderDisplayNumber(order) })}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{new Date(order.created_at).toLocaleString()}</Text>
      </View>

      {/* Status History Timeline */}
      {statusHistory.length > 0 && (
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <SectionHeader title={t('orders.statusHistory')} style={{ paddingHorizontal: 0 }} />
          <View style={styles.historyTimeline}>
            {statusHistory.map((entry, index) => {
              const isLast = index === statusHistory.length - 1;
              const iconName = TIMELINE_ICONS[entry.status] || 'circle';
              const formattedDate = new Date(entry.created_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });
              return (
                <Animated.View
                  key={entry.id}
                  entering={FadeInLeft.delay(index * 100).duration(300)}
                  style={styles.historyEntry}
                >
                  <View style={styles.historyDotContainer}>
                    <View style={[styles.historyDot, { backgroundColor: isLast ? appColors.positive : appColors.border }]}>
                      <MaterialCommunityIcons
                        name={iconName}
                        size={14}
                        color={isLast ? appColors.text.inverse : appColors.neutral}
                      />
                    </View>
                    {index < statusHistory.length - 1 && (
                      <View style={[styles.historyLine, { backgroundColor: appColors.border }]} />
                    )}
                  </View>
                  <View style={styles.historyContent}>
                    <Text variant="bodyMedium" style={[{ fontFamily: fontFamily.semiBold, color: appColors.text.primary }, isLast && { color: appColors.positive }]}>
                      {t(`status.${entry.status}`)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>
                      {formattedDate}
                    </Text>
                    {entry.notes && (
                      <Text variant="bodySmall" style={{ color: appColors.text.secondary, fontStyle: 'italic', marginTop: 2 }}>
                        {entry.notes}
                      </Text>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>
      )}

      {/* Fallback to static timeline when no history available */}
      {statusHistory.length === 0 && order.status !== 'cancelled' && order.status !== 'delivery_failed' && (
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <SectionHeader title={t('orders.trackOrder')} style={{ paddingHorizontal: 0 }} />
          <View style={styles.timeline}>
            {statusSteps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const iconName = TIMELINE_ICONS[step] || 'circle';
              return (
                <Animated.View
                  key={step}
                  entering={FadeInLeft.delay(index * 150).duration(400)}
                  style={styles.timelineStep}
                >
                  <View style={[styles.timelineDot, { backgroundColor: appColors.border }, isActive && { backgroundColor: appColors.positive }]}>
                    <MaterialCommunityIcons
                      name={iconName}
                      size={16}
                      color={isActive ? appColors.text.inverse : appColors.neutral}
                    />
                  </View>
                  {index < statusSteps.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: appColors.border }, index < currentStepIndex && { backgroundColor: appColors.positive }]} />
                  )}
                  <Text variant="labelSmall" style={[styles.timelineLabel, { color: appColors.neutral }, isActive && { color: appColors.text.primary, fontFamily: fontFamily.semiBold }]}>
                    {t(`status.${step}`)}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        </View>
      )}

      {/* Delivery OTP */}
      {order.status === 'out_for_delivery' && order.delivery_otp && (
        <View style={[styles.otpSection, { backgroundColor: appColors.positiveLight }]}>
          <Text variant="bodyMedium" style={{ color: appColors.text.secondary, marginBottom: spacing.sm }}>{t('orders.deliveryOtp')}</Text>
          <View style={styles.otpDigits}>
            {order.delivery_otp.split('').map((digit, i) => (
              <Animated.View
                key={i}
                entering={FadeInLeft.delay(i * 100).duration(300)}
                style={[styles.otpDigitBox, { borderColor: appColors.positive, backgroundColor: appColors.surface }]}
              >
                <Text variant="headlineMedium" style={{ fontFamily: fontFamily.bold, color: appColors.positive }}>{digit}</Text>
              </Animated.View>
            ))}
          </View>
          <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{t('orders.shareOtpHint')}</Text>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <SectionHeader title={t('orders.itemsTitle')} style={{ paddingHorizontal: 0 }} />
        {(order.items ?? []).map((item) => (
          <View key={item.id} style={[styles.orderItem, { borderBottomColor: appColors.border }]}>
            <View style={styles.itemInfo}>
              <Text variant="bodyMedium" style={{ fontWeight: '500', color: appColors.text.primary }}>{item.product_name}</Text>
              <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{item.weight_label || `${item.weight_grams}g`}</Text>
            </View>
            <Text variant="bodyMedium" style={{ color: appColors.text.secondary, marginHorizontal: spacing.md }}>x{item.quantity}</Text>
            <Text variant="bodyMedium" style={{ fontFamily: fontFamily.semiBold, color: appColors.text.primary }}>{formatPrice(item.total_paise || item.unit_price_paise * item.quantity)}</Text>
          </View>
        ))}
        {hasShippingBreakdown && (
          <>
            <KeyValueRow label={t('checkout.subtotal')} value={formatPrice(subtotal)} />
            <View style={styles.breakdownRow}>
              <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>{t('checkout.shipping')}</Text>
              {shipping === 0 ? <Text variant="bodyMedium" style={{ color: appColors.positive, fontFamily: fontFamily.semiBold }}>{t('checkout.free')}</Text> : <Text variant="bodyMedium">{formatPrice(shipping)}</Text>}
            </View>
          </>
        )}
        <Divider style={styles.totalDivider} />
        <View style={styles.totalRow}>
          <Text variant="titleSmall">{t('cart.total')}</Text>
          <Text variant="titleMedium" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>{formatPrice(order.total_paise)}</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <SectionHeader title={t('checkout.deliveryAddress')} style={{ paddingHorizontal: 0 }} />
        {order.shipping_full_name && <Text variant="bodyMedium" style={{ fontFamily: fontFamily.semiBold, color: appColors.text.primary, marginBottom: spacing.xs }}>{order.shipping_full_name}</Text>}
        <Text variant="bodyMedium" style={{ color: appColors.text.primary, lineHeight: 20 }}>{getDeliveryAddress(order)}</Text>
        <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: spacing.xs }}>{t('common.pincode')}: {getDeliveryPincode(order)}</Text>
        {order.shipping_phone && <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: spacing.xs }}>{order.shipping_phone}</Text>}
      </View>

      {order.notes && (
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <SectionHeader title={t('checkout.orderNotes')} style={{ paddingHorizontal: 0 }} />
          <Text variant="bodyMedium" style={{ color: appColors.text.secondary, fontStyle: 'italic' }}>{order.notes}</Text>
        </View>
      )}

      {order.admin_notes ? (
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <SectionHeader title={t('admin.adminNotes')} style={{ paddingHorizontal: 0 }} />
          <Text variant="bodyMedium" style={{ color: appColors.text.secondary, fontStyle: 'italic' }}>{order.admin_notes}</Text>
        </View>
      ) : null}

      {/* Cancel Button */}
      {canCancel && (
        <View style={styles.cancelContainer}>
          <AppButton
            variant="outline"
            size="lg"
            fullWidth
            icon="close-circle-outline"
            loading={cancelLoading}
            disabled={cancelLoading}
            onPress={() => setShowCancelModal(true)}
          >
            {t('orders.cancelOrder')}
          </AppButton>
        </View>
      )}

      {/* Reorder Button */}
      {(order.status === 'delivered' || order.status === 'cancelled') && (
        <View style={styles.reorderContainer}>
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            icon="refresh"
            loading={reorderLoading}
            disabled={reorderLoading}
            onPress={handleReorder}
          >
            {t('orders.reorder')}
          </AppButton>
        </View>
      )}

      {/* Cancel Confirmation Modal */}
      <Portal>
        <Modal
          visible={showCancelModal}
          onDismiss={() => setShowCancelModal(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: appColors.surface }]}
        >
          <Text variant="titleMedium" style={{ fontFamily: fontFamily.bold, marginBottom: spacing.md }}>
            {t('orders.cancelConfirmTitle')}
          </Text>
          <Text variant="bodyMedium" style={{ color: appColors.text.secondary, marginBottom: spacing.lg }}>
            {t('orders.cancelConfirmMessage')}
          </Text>
          <TextInput
            label={t('orders.cancelReason')}
            placeholder={t('orders.cancelReasonPlaceholder')}
            value={cancelReason}
            onChangeText={setCancelReason}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={{ marginBottom: spacing.lg }}
          />
          <View style={styles.modalActions}>
            <AppButton
              variant="outline"
              size="md"
              onPress={() => setShowCancelModal(false)}
              style={{ flex: 1, marginRight: spacing.sm }}
            >
              {t('common.cancel')}
            </AppButton>
            <AppButton
              variant="primary"
              size="md"
              loading={cancelLoading}
              disabled={cancelLoading}
              onPress={handleCancelOrder}
              style={{ flex: 1 }}
            >
              {t('common.confirm')}
            </AppButton>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { padding: spacing.lg, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontFamily: fontFamily.bold },
  timeline: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineStep: { alignItems: 'center', flex: 1 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  timelineLine: { position: 'absolute', left: '50%', top: 16, width: '100%', height: 2, zIndex: -1 },
  timelineLabel: { marginTop: spacing.sm, textAlign: 'center', fontSize: 10 },
  // History Timeline
  historyTimeline: { marginTop: spacing.sm },
  historyEntry: { flexDirection: 'row', marginBottom: spacing.md },
  historyDotContainer: { alignItems: 'center', marginRight: spacing.md },
  historyDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  historyLine: { width: 2, flex: 1, marginTop: spacing.xs },
  historyContent: { flex: 1, paddingBottom: spacing.sm },
  // OTP Section (in-house delivery)
  otpSection: { padding: 20, marginBottom: spacing.sm, alignItems: 'center' },
  otpDigits: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  otpDigitBox: { width: 48, height: 56, borderRadius: borderRadius.md, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  // Order Items
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  totalDivider: { marginTop: spacing.sm, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  reorderContainer: { padding: spacing.lg, marginBottom: spacing.xl },
  // Modal
  modalContent: { margin: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
});
