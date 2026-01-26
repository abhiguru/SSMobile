import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, Button, Card, Divider, ActivityIndicator, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../../src/store';
import {
  fetchOrderById,
  selectCurrentOrder,
  verifyDeliveryOtp,
} from '../../src/store/slices/ordersSlice';
import { formatPrice } from '../../src/constants';
import type { AppTheme } from '../../src/theme';

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();
  const order = useAppSelector(selectCurrentOrder);
  const { isLoading } = useAppSelector((state) => state.orders);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(id));
    }
  }, [dispatch, id]);

  const handleOpenMaps = () => {
    if (!order?.delivery_address) return;
    const address = encodeURIComponent(order.delivery_address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
  };

  const handleCallCustomer = () => {
    if (!order?.shipping_phone) return;
    Linking.openURL(`tel:${order.shipping_phone}`);
  };

  const handleVerifyOtp = async () => {
    if (!id) return;

    setOtpError('');

    if (otp.length !== 4) {
      setOtpError(t('delivery.otpRequired'));
      return;
    }

    const result = await dispatch(verifyDeliveryOtp({ orderId: id, otp }));

    if (verifyDeliveryOtp.fulfilled.match(result)) {
      Alert.alert(t('delivery.deliveryComplete'), '', [
        { text: 'OK', onPress: () => router.replace('/(delivery)') },
      ]);
    } else if (verifyDeliveryOtp.rejected.match(result)) {
      const errorCode = result.payload as string;
      if (errorCode === 'DELIVERY_001') {
        setOtpError(t('delivery.wrongOtp'));
      } else {
        setOtpError(errorCode);
      }
    }
  };

  if (isLoading || !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Order Info */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {formatPrice(order.total_paise)}
          </Text>
        </View>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
        <Text variant="bodyMedium" style={styles.address}>{order.delivery_address}</Text>
        <Text variant="bodySmall" style={styles.pincode}>
          {t('common.pincode')}: {order.delivery_pincode}
        </Text>

        <View style={styles.actionsRow}>
          <Button
            mode="contained-tonal"
            icon="map-marker"
            onPress={handleOpenMaps}
            style={styles.actionButton}
          >
            {t('delivery.openMaps')}
          </Button>
          {order.shipping_phone && (
            <Button
              mode="contained-tonal"
              icon="phone"
              onPress={handleCallCustomer}
              style={styles.actionButton}
            >
              {t('delivery.callCustomer')}
            </Button>
          )}
        </View>
      </View>

      {/* Items to Deliver */}
      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('delivery.itemsToDeliver')}</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text variant="bodyMedium" style={styles.itemName}>{item.product_name}</Text>
              <Text variant="bodySmall" style={styles.itemWeight}>{item.weight_grams}g</Text>
            </View>
            <Text variant="bodyMedium" style={styles.itemQty}>x{item.quantity}</Text>
          </View>
        ))}
      </View>

      {/* Notes */}
      {order.notes && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.orderNotes')}</Text>
          <Text variant="bodyMedium" style={styles.notes}>{order.notes}</Text>
        </View>
      )}

      {/* OTP Verification */}
      <Card mode="elevated" style={styles.otpCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            {t('delivery.verifyDelivery')}
          </Text>
          <Text variant="bodySmall" style={styles.otpHint}>
            {t('delivery.askCustomerForOtp')}
          </Text>

          <TextInput
            mode="outlined"
            label={t('delivery.enterOtp')}
            placeholder="1234"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={4}
            error={!!otpError}
            style={styles.otpInput}
          />
          {otpError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 12 }}>
              {otpError}
            </Text>
          ) : null}

          <Button
            mode="contained"
            buttonColor={theme.custom.success}
            onPress={handleVerifyOtp}
            loading={isLoading}
            disabled={isLoading || otp.length !== 4}
            contentStyle={styles.verifyButtonContent}
            labelStyle={styles.verifyButtonLabel}
          >
            {t('delivery.confirmDelivery')}
          </Button>
        </Card.Content>
      </Card>
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
  },
  orderId: {
    fontWeight: 'bold',
    color: '#333333',
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  address: {
    color: '#333333',
    lineHeight: 20,
  },
  pincode: {
    color: '#666666',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
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
  },
  notes: {
    color: '#666666',
    fontStyle: 'italic',
  },
  otpCard: {
    margin: 16,
    marginBottom: 32,
  },
  otpHint: {
    color: '#666666',
    marginBottom: 16,
  },
  otpInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  verifyButtonContent: {
    paddingVertical: 8,
  },
  verifyButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
