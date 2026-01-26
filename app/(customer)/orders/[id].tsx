import { useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Button, Divider, ActivityIndicator, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../../../src/store';
import { fetchOrderById, selectCurrentOrder, reorder } from '../../../src/store/slices/ordersSlice';
import { formatPrice } from '../../../src/constants';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import type { AppTheme } from '../../../src/theme';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();
  const order = useAppSelector(selectCurrentOrder);
  const { isLoading } = useAppSelector((state) => state.orders);

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(id));
    }
  }, [dispatch, id]);

  const handleReorder = async () => {
    if (!id) return;
    const result = await dispatch(reorder(id));
    if (reorder.fulfilled.match(result)) {
      router.replace('/(customer)/orders');
    }
  };

  const getOrderDisplayNumber = (order: Order) => {
    if (order.order_number) {
      return order.order_number;
    }
    return `#${(order.id ?? '').slice(0, 8).toUpperCase()}`;
  };

  const getDeliveryAddress = (order: Order) => {
    if (order.shipping_address_line1) {
      const parts = [
        order.shipping_address_line1,
        order.shipping_address_line2,
        order.shipping_city,
        order.shipping_state,
      ].filter(Boolean);
      return parts.join(', ');
    }
    return order.delivery_address || '';
  };

  const getDeliveryPincode = (order: Order) => {
    return order.shipping_pincode || order.delivery_pincode || '';
  };

  if (isLoading || !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const statusSteps = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.status);

  const subtotal = order.subtotal_paise ?? (order.items ?? []).reduce(
    (sum, item) => sum + (item.total_paise || item.unit_price_paise * item.quantity),
    0
  );
  const shipping = order.shipping_paise ?? 0;
  const hasShippingBreakdown = order.subtotal_paise !== undefined;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.orderId}>
            {t('orders.orderNumber', { id: getOrderDisplayNumber(order) })}
          </Text>
          <StatusBadge status={order.status} />
        </View>
        <Text variant="bodySmall" style={styles.date}>
          {new Date(order.created_at).toLocaleString()}
        </Text>
      </View>

      {/* Status Timeline */}
      {order.status !== 'cancelled' && order.status !== 'delivery_failed' && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('orders.trackOrder')}</Text>
          <View style={styles.timeline}>
            {statusSteps.map((step, index) => (
              <View key={step} style={styles.timelineStep}>
                <View
                  style={[
                    styles.timelineDot,
                    index <= currentStepIndex && styles.timelineDotActive,
                  ]}
                />
                {index < statusSteps.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      index < currentStepIndex && styles.timelineLineActive,
                    ]}
                  />
                )}
                <Text
                  variant="labelSmall"
                  style={[
                    styles.timelineLabel,
                    index <= currentStepIndex && styles.timelineLabelActive,
                  ]}
                >
                  {t(`status.${step}`)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Delivery OTP */}
      {order.status === 'out_for_delivery' && order.delivery_otp && (
        <View style={styles.otpSection}>
          <Text variant="bodyMedium" style={styles.otpLabel}>{t('orders.deliveryOtp')}</Text>
          <Text variant="displaySmall" style={styles.otpCode}>{order.delivery_otp}</Text>
          <Text variant="bodySmall" style={styles.otpHint}>
            {t('orders.shareOtpHint')}
          </Text>
        </View>
      )}

      {/* Order Items */}
      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('orders.itemsTitle')}</Text>
        {(order.items ?? []).map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text variant="bodyMedium" style={styles.itemName}>{item.product_name}</Text>
              <Text variant="bodySmall" style={styles.itemWeight}>
                {item.weight_label || `${item.weight_grams}g`}
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.itemQty}>x{item.quantity}</Text>
            <Text variant="bodyMedium" style={styles.itemPrice}>
              {formatPrice(item.total_paise || item.unit_price_paise * item.quantity)}
            </Text>
          </View>
        ))}

        {hasShippingBreakdown ? (
          <>
            <View style={styles.breakdownRow}>
              <Text variant="bodyMedium" style={styles.breakdownLabel}>{t('checkout.subtotal')}</Text>
              <Text variant="bodyMedium">{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text variant="bodyMedium" style={styles.breakdownLabel}>{t('checkout.shipping')}</Text>
              {shipping === 0 ? (
                <Text variant="bodyMedium" style={{ color: theme.custom.success, fontWeight: '600' }}>
                  {t('checkout.free')}
                </Text>
              ) : (
                <Text variant="bodyMedium">{formatPrice(shipping)}</Text>
              )}
            </View>
          </>
        ) : null}

        <Divider style={styles.totalDivider} />
        <View style={styles.totalRow}>
          <Text variant="titleSmall">{t('cart.total')}</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {formatPrice(order.total_paise)}
          </Text>
        </View>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
        {order.shipping_full_name && (
          <Text variant="bodyMedium" style={styles.addressName}>{order.shipping_full_name}</Text>
        )}
        <Text variant="bodyMedium" style={styles.address}>{getDeliveryAddress(order)}</Text>
        <Text variant="bodySmall" style={styles.pincode}>
          {t('common.pincode')}: {getDeliveryPincode(order)}
        </Text>
        {order.shipping_phone && (
          <Text variant="bodySmall" style={styles.phone}>{order.shipping_phone}</Text>
        )}
      </View>

      {/* Notes */}
      {order.notes && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.orderNotes')}</Text>
          <Text variant="bodyMedium" style={styles.notes}>{order.notes}</Text>
        </View>
      )}

      {/* Reorder Button */}
      {(order.status === 'delivered' || order.status === 'cancelled') && (
        <Button
          mode="contained"
          icon="refresh"
          onPress={handleReorder}
          loading={isLoading}
          disabled={isLoading}
          style={styles.reorderButton}
          contentStyle={styles.reorderContent}
          labelStyle={styles.reorderLabel}
        >
          {t('orders.reorder')}
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontWeight: 'bold',
    color: '#333333',
  },
  date: {
    color: '#666666',
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DDDDDD',
  },
  timelineDotActive: {
    backgroundColor: '#4CAF50',
  },
  timelineLine: {
    position: 'absolute',
    left: '50%',
    top: 8,
    width: '100%',
    height: 2,
    backgroundColor: '#DDDDDD',
    zIndex: -1,
  },
  timelineLineActive: {
    backgroundColor: '#4CAF50',
  },
  timelineLabel: {
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  timelineLabelActive: {
    color: '#333333',
    fontWeight: '500',
  },
  otpSection: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    marginBottom: 8,
    alignItems: 'center',
  },
  otpLabel: {
    color: '#666666',
    marginBottom: 8,
  },
  otpCode: {
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 8,
    marginBottom: 8,
  },
  otpHint: {
    color: '#666666',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '500',
    color: '#333333',
  },
  itemWeight: {
    color: '#666666',
  },
  itemQty: {
    color: '#666666',
    marginHorizontal: 16,
  },
  itemPrice: {
    fontWeight: '600',
    color: '#333333',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    color: '#666666',
  },
  totalDivider: {
    marginTop: 8,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressName: {
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  address: {
    color: '#333333',
    lineHeight: 20,
  },
  pincode: {
    color: '#666666',
    marginTop: 4,
  },
  phone: {
    color: '#666666',
    marginTop: 4,
  },
  notes: {
    color: '#666666',
    fontStyle: 'italic',
  },
  reorderButton: {
    margin: 16,
    borderRadius: 8,
  },
  reorderContent: {
    paddingVertical: 8,
  },
  reorderLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
});
