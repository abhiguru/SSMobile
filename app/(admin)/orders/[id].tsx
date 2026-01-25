import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../src/store';
import {
  fetchOrderById,
  selectCurrentOrder,
  updateOrderStatus,
} from '../../../src/store/slices/ordersSlice';
import { formatPrice } from '../../../src/constants';
import { OrderStatus } from '../../../src/types';

const STATUS_ACTIONS: Record<string, OrderStatus[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'delivery_failed'],
};

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const order = useAppSelector(selectCurrentOrder);
  const { isLoading } = useAppSelector((state) => state.orders);

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(id));
    }
  }, [dispatch, id]);

  const handleStatusUpdate = (newStatus: OrderStatus) => {
    Alert.alert(
      t('admin.confirmStatusUpdate'),
      t('admin.updateStatusTo', { status: t(`status.${newStatus}`) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            if (id) {
              await dispatch(updateOrderStatus({ orderId: id, status: newStatus }));
            }
          },
        },
      ]
    );
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

  if (isLoading || !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  const availableActions = STATUS_ACTIONS[order.status] || [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
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

      {/* Status Actions */}
      {availableActions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.updateStatus')}</Text>
          <View style={styles.actionsRow}>
            {availableActions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.actionButton,
                  status === 'cancelled' || status === 'delivery_failed'
                    ? styles.actionButtonDanger
                    : styles.actionButtonPrimary,
                ]}
                onPress={() => handleStatusUpdate(status)}
              >
                <Text style={styles.actionButtonText}>
                  {t(`status.${status}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Customer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
        <Text style={styles.address}>{order.delivery_address}</Text>
        <Text style={styles.pincode}>{t('common.pincode')}: {order.delivery_pincode}</Text>
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.orderItems')}</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product_name}</Text>
              <Text style={styles.itemWeight}>{item.weight_grams}g</Text>
            </View>
            <Text style={styles.itemQty}>x{item.quantity}</Text>
            <Text style={styles.itemPrice}>{formatPrice(item.total_paise || item.unit_price_paise * item.quantity)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('cart.total')}</Text>
          <Text style={styles.totalAmount}>{formatPrice(order.total_paise)}</Text>
        </View>
      </View>

      {/* Notes */}
      {order.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.orderNotes')}</Text>
          <Text style={styles.notes}>{order.notes}</Text>
        </View>
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
    fontSize: 20,
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
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  actionButtonDanger: {
    backgroundColor: '#E53935',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  notes: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
});
