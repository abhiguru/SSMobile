import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../src/store';
import {
  fetchOrderById,
  selectCurrentOrder,
  verifyDeliveryOtp,
} from '../../src/store/slices/ordersSlice';
import { formatPrice, DELIVERY_OTP_LENGTH } from '../../src/constants';

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const order = useAppSelector(selectCurrentOrder);
  const { isLoading } = useAppSelector((state) => state.orders);

  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(id));
    }
  }, [dispatch, id]);

  const handleVerifyOtp = async () => {
    if (otp.length !== DELIVERY_OTP_LENGTH) {
      Alert.alert('Error', 'Please enter a valid 4-digit OTP');
      return;
    }

    if (!id) return;

    const result = await dispatch(verifyDeliveryOtp({ orderId: id, otp }));

    if (verifyDeliveryOtp.fulfilled.match(result)) {
      Alert.alert(t('delivery.deliveryComplete'), '', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', t('delivery.wrongDeliveryOtp'));
    }
  };

  const handleCallCustomer = () => {
    // In a real app, you'd have the customer's phone number
    Alert.alert('Call Customer', 'Phone call feature not available in demo');
  };

  const handleOpenMaps = () => {
    if (order && order.delivery_address) {
      const address = encodeURIComponent(order.delivery_address);
      Linking.openURL(`https://maps.google.com/maps?q=${address}`);
    }
  };

  if (isLoading || !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.orderId}>{t('orders.orderNumber', { id: order.id.slice(0, 8) })}</Text>
        <Text style={styles.orderTotal}>{formatPrice(order.total_paise)}</Text>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('delivery.deliveryAddress')}</Text>
        <Text style={styles.address}>{order.delivery_address}</Text>
        <Text style={styles.pincode}>{t('common.pincode')}: {order.delivery_pincode}</Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenMaps}>
            <Text style={styles.actionButtonText}>📍 {t('delivery.openInMaps')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleCallCustomer}>
            <Text style={styles.actionButtonText}>📞 {t('delivery.callCustomer')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('delivery.itemsToDeliver')}</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <Text style={styles.itemName}>
              {item.product_name} ({item.weight_grams}g)
            </Text>
            <Text style={styles.itemQty}>x{item.quantity}</Text>
          </View>
        ))}
      </View>

      {/* Notes */}
      {order.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('delivery.deliveryNotes')}</Text>
          <Text style={styles.notes}>{order.notes}</Text>
        </View>
      )}

      {/* OTP Verification */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('delivery.verifyDelivery')}</Text>
        <Text style={styles.otpInstruction}>{t('delivery.enterDeliveryOtp')}</Text>

        <TextInput
          style={styles.otpInput}
          placeholder="0000"
          keyboardType="number-pad"
          maxLength={DELIVERY_OTP_LENGTH}
          value={otp}
          onChangeText={setOtp}
        />

        <TouchableOpacity
          style={[
            styles.verifyButton,
            otp.length !== DELIVERY_OTP_LENGTH && styles.verifyButtonDisabled,
          ]}
          onPress={handleVerifyOtp}
          disabled={otp.length !== DELIVERY_OTP_LENGTH || isLoading}
        >
          <Text style={styles.verifyButtonText}>
            {isLoading ? t('common.loading') : t('delivery.completeDelivery')}
          </Text>
        </TouchableOpacity>
      </View>
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
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  orderTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  address: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  pincode: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  itemName: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  itemQty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  notes: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  otpInstruction: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 16,
    letterSpacing: 16,
    marginBottom: 16,
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
