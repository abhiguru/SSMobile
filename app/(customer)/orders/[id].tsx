import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../src/store';
import { fetchOrderById, selectCurrentOrder, reorder } from '../../../src/store/slices/ordersSlice';
import { formatPrice } from '../../../src/constants';
import { Order } from '../../../src/types';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
      case 'delivery_failed':
        return '#E53935';
      case 'out_for_delivery':
        return '#2196F3';
      default:
        return '#FF9800';
    }
  };

  const getOrderDisplayNumber = (order: Order) => {
    if (order.order_number) {
      return order.order_number;
    }
    return `#${order.id.slice(0, 8).toUpperCase()}`;
  };

  const getDeliveryAddress = (order: Order) => {
    // Use new structured fields if available
    if (order.shipping_address_line1) {
      const parts = [
        order.shipping_address_line1,
        order.shipping_address_line2,
        order.shipping_city,
        order.shipping_state,
      ].filter(Boolean);
      return parts.join(', ');
    }
    // Fall back to legacy field
    return order.delivery_address || '';
  };

  const getDeliveryPincode = (order: Order) => {
    return order.shipping_pincode || order.delivery_pincode || '';
  };

  if (isLoading || !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  const statusSteps = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.status);

  // Calculate subtotal from items if not provided
  const subtotal = order.subtotal_paise ?? order.items.reduce(
    (sum, item) => sum + (item.total_paise || item.unit_price_paise * item.quantity),
    0
  );
  const shipping = order.shipping_paise ?? 0;
  const hasShippingBreakdown = order.subtotal_paise !== undefined;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.orderId}>
            {t('orders.orderNumber', { id: getOrderDisplayNumber(order) })}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.status) },
            ]}
          >
            <Text style={styles.statusText}>{t(`status.${order.status}`)}</Text>
          </View>
        </View>

        <Text style={styles.date}>
          {new Date(order.created_at).toLocaleString()}
        </Text>
      </View>

      {/* Status Timeline */}
      {order.status !== 'cancelled' && order.status !== 'delivery_failed' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('orders.trackOrder')}</Text>
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
          <Text style={styles.otpLabel}>{t('orders.deliveryOtp')}</Text>
          <Text style={styles.otpCode}>{order.delivery_otp}</Text>
          <Text style={styles.otpHint}>
            {t('orders.shareOtpHint')}
          </Text>
        </View>
      )}

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('orders.itemsTitle')}</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product_name}</Text>
              <Text style={styles.itemWeight}>
                {item.weight_label || `${item.weight_grams}g`}
              </Text>
            </View>
            <Text style={styles.itemQty}>x{item.quantity}</Text>
            <Text style={styles.itemPrice}>
              {formatPrice(item.total_paise || item.unit_price_paise * item.quantity)}
            </Text>
          </View>
        ))}

        {/* Price Breakdown */}
        {hasShippingBreakdown ? (
          <>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{t('checkout.subtotal')}</Text>
              <Text style={styles.breakdownValue}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{t('checkout.shipping')}</Text>
              {shipping === 0 ? (
                <Text style={styles.freeShipping}>{t('checkout.free')}</Text>
              ) : (
                <Text style={styles.breakdownValue}>{formatPrice(shipping)}</Text>
              )}
            </View>
          </>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('cart.total')}</Text>
          <Text style={styles.totalAmount}>{formatPrice(order.total_paise)}</Text>
        </View>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
        {order.shipping_full_name && (
          <Text style={styles.addressName}>{order.shipping_full_name}</Text>
        )}
        <Text style={styles.address}>{getDeliveryAddress(order)}</Text>
        <Text style={styles.pincode}>
          {t('common.pincode')}: {getDeliveryPincode(order)}
        </Text>
        {order.shipping_phone && (
          <Text style={styles.phone}>{order.shipping_phone}</Text>
        )}
      </View>

      {/* Notes */}
      {order.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.orderNotes')}</Text>
          <Text style={styles.notes}>{order.notes}</Text>
        </View>
      )}

      {/* Reorder Button */}
      {(order.status === 'delivered' || order.status === 'cancelled') && (
        <TouchableOpacity
          style={styles.reorderButton}
          onPress={handleReorder}
          disabled={isLoading}
        >
          <Text style={styles.reorderButtonText}>{t('orders.reorder')}</Text>
        </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  date: {
    fontSize: 14,
    color: '#666666',
  },
  sectionTitle: {
    fontSize: 16,
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
    fontSize: 10,
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
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  otpCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 8,
    marginBottom: 8,
  },
  otpHint: {
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  itemWeight: {
    fontSize: 12,
    color: '#666666',
  },
  itemQty: {
    fontSize: 14,
    color: '#666666',
    marginHorizontal: 16,
  },
  itemPrice: {
    fontSize: 14,
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
    fontSize: 14,
    color: '#666666',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#333333',
  },
  freeShipping: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  pincode: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  phone: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  notes: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  reorderButton: {
    backgroundColor: '#FF6B35',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  reorderButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
