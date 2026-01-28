import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Divider, ActivityIndicator, useTheme, SegmentedButtons } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import {
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useGetPorterQuoteMutation,
  useBookPorterDeliveryMutation,
  useCancelPorterDeliveryMutation,
  useDispatchOrderMutation,
} from '../../../src/store/apiSlice';
import { formatPrice, ORDER_STATUS_COLORS } from '../../../src/constants';
import { colors, spacing, fontFamily, borderRadius } from '../../../src/constants/theme';
import { OrderStatus, DeliveryType, PorterQuoteResponse } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { AppButton } from '../../../src/components/common/AppButton';
import { useToast } from '../../../src/components/common/Toast';
import { hapticSuccess, hapticError } from '../../../src/utils/haptics';
import type { AppTheme } from '../../../src/theme';

const STATUS_ACTIONS: Record<string, OrderStatus[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: [], // Handled by delivery type selector
  out_for_delivery: ['delivered', 'delivery_failed'],
};

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme<AppTheme>();
  const { showToast } = useToast();
  const { data: order, isLoading, refetch } = useGetOrderByIdQuery(id!, { skip: !id });
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [getPorterQuote, { isLoading: quoteLoading }] = useGetPorterQuoteMutation();
  const [bookPorterDelivery, { isLoading: bookingPorter }] = useBookPorterDeliveryMutation();
  const [cancelPorterDelivery, { isLoading: cancellingPorter }] = useCancelPorterDeliveryMutation();
  const [dispatchOrder, { isLoading: dispatching }] = useDispatchOrderMutation();

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('porter');
  const [porterQuote, setPorterQuote] = useState<PorterQuoteResponse['quote'] | null>(null);

  const handleStatusUpdate = (newStatus: OrderStatus) => {
    const isDanger = newStatus === 'cancelled' || newStatus === 'delivery_failed';

    if (isDanger) {
      Alert.alert(t('admin.confirmStatusUpdate'), t('admin.updateStatusTo', { status: t(`status.${newStatus}`) }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            if (!id) return;
            try {
              await updateOrderStatus({ orderId: id, status: newStatus }).unwrap();
              hapticSuccess();
              showToast({ message: t(`status.${newStatus}`), type: 'success' });
            } catch (err: unknown) {
              hapticError();
              const errorData = (err as { data?: string })?.data;
              showToast({ message: errorData || t('common.error'), type: 'error' });
            }
          },
        },
      ]);
    } else {
      (async () => {
        if (!id) return;
        try {
          await updateOrderStatus({ orderId: id, status: newStatus }).unwrap();
          hapticSuccess();
          showToast({ message: t(`status.${newStatus}`), type: 'success' });
        } catch (err: unknown) {
          hapticError();
          const errorData = (err as { data?: string })?.data;
          showToast({ message: errorData || t('common.error'), type: 'error' });
        }
      })();
    }
  };

  const handleGetPorterQuote = async () => {
    if (!id) return;
    try {
      const result = await getPorterQuote(id).unwrap();
      if (result.success) {
        setPorterQuote(result.quote);
        hapticSuccess();
      } else {
        hapticError();
        showToast({ message: result.message || 'Failed to get quote', type: 'error' });
      }
    } catch (err: unknown) {
      hapticError();
      const errorData = (err as { data?: string })?.data;
      showToast({ message: errorData || 'Failed to get Porter quote', type: 'error' });
    }
  };

  const handleBookPorter = async () => {
    if (!id) return;
    Alert.alert(
      'Book Porter Delivery',
      `Estimated fare: ${porterQuote?.fare_display || 'N/A'}\nETA: ${porterQuote?.estimated_time_display || 'N/A'}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Book Porter',
          onPress: async () => {
            try {
              const result = await bookPorterDelivery(id).unwrap();
              if (result.success) {
                hapticSuccess();
                showToast({ message: 'Porter delivery booked!', type: 'success' });
                setPorterQuote(null);
                refetch();
              } else {
                hapticError();
                showToast({ message: result.message || 'Booking failed', type: 'error' });
              }
            } catch (err: unknown) {
              hapticError();
              const errorData = (err as { data?: string })?.data;
              showToast({ message: errorData || 'Failed to book Porter', type: 'error' });
            }
          },
        },
      ]
    );
  };

  const handleCancelPorter = (fallbackToInhouse: boolean) => {
    if (!id) return;
    const title = fallbackToInhouse ? 'Cancel & Reassign' : 'Cancel Porter';
    const message = fallbackToInhouse
      ? 'Cancel Porter delivery and return order to dispatch queue?'
      : 'Cancel Porter delivery? Order will be marked as delivery failed.';

    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelPorterDelivery({
              orderId: id,
              reason: fallbackToInhouse ? 'Reassigning to in-house' : 'Cancelled by admin',
              fallbackToInhouse,
            }).unwrap();
            hapticSuccess();
            showToast({
              message: fallbackToInhouse ? 'Order returned to dispatch queue' : 'Porter cancelled',
              type: 'success',
            });
            refetch();
          } catch (err: unknown) {
            hapticError();
            const errorData = (err as { data?: string })?.data;
            showToast({ message: errorData || 'Failed to cancel', type: 'error' });
          }
        },
      },
    ]);
  };

  const handleDispatchInHouse = () => {
    if (!id) return;
    // TODO: Add staff picker - for now using placeholder
    Alert.alert(
      'Dispatch In-House',
      'Select delivery staff (feature coming soon)',
      [{ text: 'OK' }]
    );
  };

  const openTrackingUrl = () => {
    if (order?.porter_delivery?.tracking_url) {
      Linking.openURL(order.porter_delivery.tracking_url);
    }
  };

  const callDriver = () => {
    if (order?.porter_delivery?.driver_phone) {
      Linking.openURL(`tel:${order.porter_delivery.driver_phone}`);
    }
  };

  if (isLoading || !order) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);
  }

  const availableActions = STATUS_ACTIONS[order.status] || [];
  const stripeColor = ORDER_STATUS_COLORS[order.status] || colors.critical;
  const isConfirmed = order.status === 'confirmed';
  const isOutForDelivery = order.status === 'out_for_delivery';
  const isPorterDelivery = order.delivery_type === 'porter';
  const porterDelivery = order.porter_delivery;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerStripe, { backgroundColor: stripeColor }]} />
            <Text variant="titleMedium" style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          </View>
          <StatusBadge status={order.status} />
        </View>
        <Text variant="bodySmall" style={styles.date}>{new Date(order.created_at).toLocaleString()}</Text>
        {order.delivery_type && (
          <View style={styles.deliveryTypeBadge}>
            <MaterialCommunityIcons
              name={order.delivery_type === 'porter' ? 'motorbike' : 'account'}
              size={14}
              color={colors.text.secondary}
            />
            <Text variant="labelSmall" style={styles.deliveryTypeText}>
              {order.delivery_type === 'porter' ? 'Porter Delivery' : 'In-House Delivery'}
            </Text>
          </View>
        )}
      </View>

      {/* Standard status actions for placed orders */}
      {order.status === 'placed' && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('admin.updateStatus')}</Text>
          <View style={styles.actionsRow}>
            {availableActions.map((status) => {
              const isDanger = status === 'cancelled' || status === 'delivery_failed';
              return (
                <View key={status} style={styles.actionButtonWrapper}>
                  <AppButton
                    variant={isDanger ? 'danger' : 'primary'}
                    size="md"
                    fullWidth
                    onPress={() => handleStatusUpdate(status)}
                  >
                    {t(`status.${status}`)}
                  </AppButton>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Delivery type selector for confirmed orders */}
      {isConfirmed && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Dispatch Order</Text>

          <SegmentedButtons
            value={deliveryType}
            onValueChange={(v) => {
              setDeliveryType(v as DeliveryType);
              setPorterQuote(null);
            }}
            buttons={[
              { value: 'porter', label: 'Porter', icon: 'motorbike' },
              { value: 'in_house', label: 'In-House', icon: 'account' },
            ]}
            style={styles.segmentedButtons}
          />

          {deliveryType === 'porter' && (
            <View style={styles.porterSection}>
              {!porterQuote ? (
                <AppButton
                  variant="secondary"
                  size="md"
                  fullWidth
                  loading={quoteLoading}
                  disabled={quoteLoading}
                  icon="calculator"
                  onPress={handleGetPorterQuote}
                >
                  Get Porter Quote
                </AppButton>
              ) : (
                <View style={styles.quoteCard}>
                  <View style={styles.quoteRow}>
                    <Text variant="bodyMedium" style={styles.quoteLabel}>Estimated Fare</Text>
                    <Text variant="titleMedium" style={styles.quoteValue}>{porterQuote.fare_display}</Text>
                  </View>
                  <View style={styles.quoteRow}>
                    <Text variant="bodyMedium" style={styles.quoteLabel}>Delivery Time</Text>
                    <Text variant="bodyMedium">{porterQuote.estimated_time_display}</Text>
                  </View>
                  <View style={styles.quoteRow}>
                    <Text variant="bodyMedium" style={styles.quoteLabel}>Distance</Text>
                    <Text variant="bodyMedium">{porterQuote.distance_km} km</Text>
                  </View>
                  <AppButton
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={bookingPorter}
                    disabled={bookingPorter}
                    icon="motorbike"
                    onPress={handleBookPorter}
                    style={{ marginTop: spacing.md }}
                  >
                    Book Porter Delivery
                  </AppButton>
                </View>
              )}
            </View>
          )}

          {deliveryType === 'in_house' && (
            <View style={styles.inHouseSection}>
              <AppButton
                variant="primary"
                size="lg"
                fullWidth
                loading={dispatching}
                disabled={dispatching}
                icon="account-arrow-right"
                onPress={handleDispatchInHouse}
              >
                Assign Delivery Staff
              </AppButton>
            </View>
          )}

          <View style={styles.cancelOption}>
            <AppButton
              variant="text"
              size="sm"
              onPress={() => handleStatusUpdate('cancelled')}
            >
              Cancel Order
            </AppButton>
          </View>
        </View>
      )}

      {/* Porter tracking section for out_for_delivery */}
      {isOutForDelivery && isPorterDelivery && porterDelivery && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Porter Delivery</Text>

          <View style={styles.porterStatusCard}>
            <View style={styles.porterStatusRow}>
              <Text variant="bodyMedium" style={styles.quoteLabel}>Status</Text>
              <View style={[styles.porterStatusBadge, { backgroundColor: getPorterStatusColor(porterDelivery.porter_status) }]}>
                <Text style={styles.porterStatusText}>{formatPorterStatus(porterDelivery.porter_status)}</Text>
              </View>
            </View>

            {porterDelivery.driver_name && (
              <Pressable onPress={callDriver} style={styles.driverCard}>
                <MaterialCommunityIcons name="account" size={24} color={colors.brand} />
                <View style={styles.driverInfo}>
                  <Text variant="bodyMedium" style={styles.driverName}>{porterDelivery.driver_name}</Text>
                  {porterDelivery.driver_phone && (
                    <Text variant="bodySmall" style={styles.driverPhone}>{porterDelivery.driver_phone}</Text>
                  )}
                  {porterDelivery.vehicle_number && (
                    <Text variant="bodySmall" style={styles.vehicleNumber}>{porterDelivery.vehicle_number}</Text>
                  )}
                </View>
                <MaterialCommunityIcons name="phone" size={24} color={colors.positive} />
              </Pressable>
            )}

            {porterDelivery.tracking_url && (
              <AppButton
                variant="secondary"
                size="md"
                fullWidth
                icon="map-marker"
                onPress={openTrackingUrl}
                style={{ marginTop: spacing.md }}
              >
                Track on Porter
              </AppButton>
            )}

            <View style={styles.porterActions}>
              <AppButton
                variant="text"
                size="sm"
                onPress={() => handleCancelPorter(true)}
                loading={cancellingPorter}
              >
                Cancel & Reassign
              </AppButton>
              <AppButton
                variant="danger"
                size="sm"
                onPress={() => handleCancelPorter(false)}
                loading={cancellingPorter}
              >
                Cancel Delivery
              </AppButton>
            </View>
          </View>
        </View>
      )}

      {/* Standard actions for out_for_delivery (in-house) */}
      {isOutForDelivery && !isPorterDelivery && availableActions.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('admin.updateStatus')}</Text>
          <View style={styles.actionsRow}>
            {availableActions.map((status) => {
              const isDanger = status === 'cancelled' || status === 'delivery_failed';
              return (
                <View key={status} style={styles.actionButtonWrapper}>
                  <AppButton
                    variant={isDanger ? 'danger' : 'primary'}
                    size="md"
                    fullWidth
                    onPress={() => handleStatusUpdate(status)}
                  >
                    {t(`status.${status}`)}
                  </AppButton>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
        <Text variant="bodyMedium" style={styles.address}>
          {order.shipping_address_line1 || order.delivery_address}
        </Text>
        {order.shipping_address_line2 && (
          <Text variant="bodyMedium" style={styles.address}>{order.shipping_address_line2}</Text>
        )}
        <Text variant="bodySmall" style={styles.pincode}>
          {order.shipping_city && `${order.shipping_city}, `}
          {t('common.pincode')}: {order.shipping_pincode || order.delivery_pincode}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('admin.orderItems')}</Text>
        {(order.items ?? []).map((item) => (
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
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontFamily: fontFamily.bold }}>{formatPrice(order.total_paise)}</Text>
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

function getPorterStatusColor(status?: string): string {
  switch (status) {
    case 'allocated':
    case 'reached_for_pickup':
      return colors.brandLight;
    case 'picked_up':
    case 'reached_for_drop':
      return colors.positiveLight;
    case 'ended':
      return colors.positive;
    case 'cancelled':
      return colors.criticalLight;
    default:
      return colors.neutralLight;
  }
}

function formatPorterStatus(status?: string): string {
  switch (status) {
    case 'live':
    case 'pending':
      return 'Searching...';
    case 'allocated':
      return 'Driver Assigned';
    case 'reached_for_pickup':
      return 'At Pickup';
    case 'picked_up':
      return 'Picked Up';
    case 'reached_for_drop':
      return 'Arriving';
    case 'ended':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || 'Unknown';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: colors.surface, padding: spacing.lg, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerStripe: { width: 4, height: 24, borderRadius: 2, marginRight: spacing.sm },
  orderId: { fontFamily: fontFamily.bold, color: colors.text.primary },
  date: { color: colors.text.secondary },
  deliveryTypeBadge: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.xs },
  deliveryTypeText: { color: colors.text.secondary },
  sectionTitle: { fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.text.secondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButtonWrapper: { flex: 1 },
  segmentedButtons: { marginBottom: spacing.lg },
  porterSection: { marginTop: spacing.sm },
  quoteCard: { backgroundColor: colors.shell, padding: spacing.md, borderRadius: borderRadius.md },
  quoteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  quoteLabel: { color: colors.text.secondary },
  quoteValue: { color: colors.brand, fontFamily: fontFamily.bold },
  inHouseSection: { marginTop: spacing.sm },
  cancelOption: { marginTop: spacing.md, alignItems: 'center' },
  porterStatusCard: { backgroundColor: colors.shell, padding: spacing.md, borderRadius: borderRadius.md },
  porterStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  porterStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  porterStatusText: { fontSize: 12, fontFamily: fontFamily.semiBold, color: colors.text.primary },
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, gap: spacing.md },
  driverInfo: { flex: 1 },
  driverName: { fontFamily: fontFamily.semiBold, color: colors.text.primary },
  driverPhone: { color: colors.text.secondary },
  vehicleNumber: { color: colors.text.secondary },
  porterActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  address: { color: colors.text.primary, lineHeight: 20 },
  pincode: { color: colors.text.secondary, marginTop: spacing.xs },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: fontFamily.regular, color: colors.text.primary },
  itemWeight: { color: colors.text.secondary },
  itemQty: { color: colors.text.secondary, marginHorizontal: spacing.lg },
  itemPrice: { fontFamily: fontFamily.semiBold, color: colors.text.primary },
  totalDivider: { marginTop: spacing.sm, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notes: { color: colors.text.secondary, fontStyle: 'italic' },
});
