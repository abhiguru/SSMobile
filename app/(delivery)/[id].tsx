import { useState } from 'react';
import { View, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, Button, Card, ActivityIndicator, useTheme } from 'react-native-paper';

import { useGetOrderByIdQuery, useVerifyDeliveryOtpMutation } from '../../src/store/apiSlice';
import { formatPrice } from '../../src/constants';
import { colors, spacing } from '../../src/constants/theme';
import type { AppTheme } from '../../src/theme';

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: order, isLoading } = useGetOrderByIdQuery(id!, { skip: !id });
  const [verifyDeliveryOtp, { isLoading: verifying }] = useVerifyDeliveryOtpMutation();
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  const handleOpenMaps = () => {
    if (!order?.delivery_address) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`);
  };

  const handleCallCustomer = () => {
    if (!order?.shipping_phone) return;
    Linking.openURL(`tel:${order.shipping_phone}`);
  };

  const handleVerifyOtp = async () => {
    if (!id) return;
    setOtpError('');
    if (otp.length !== 4) { setOtpError(t('delivery.otpRequired')); return; }
    try {
      await verifyDeliveryOtp({ orderId: id, otp }).unwrap();
      Alert.alert(t('delivery.deliveryComplete'), '', [{ text: 'OK', onPress: () => router.replace('/(delivery)') }]);
    } catch (error) {
      const errorCode = typeof error === 'object' && error !== null && 'data' in error ? String((error as { data: unknown }).data) : '';
      if (errorCode === 'DELIVERY_001') setOtpError(t('delivery.wrongOtp'));
      else setOtpError(errorCode || t('common.error'));
    }
  };

  if (isLoading || !order) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(order.total_paise)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
        <Text variant="bodyMedium" style={styles.address}>{order.delivery_address}</Text>
        <Text variant="bodySmall" style={styles.pincode}>{t('common.pincode')}: {order.delivery_pincode}</Text>
        <View style={styles.actionsRow}>
          <Button mode="contained-tonal" icon="map-marker" onPress={handleOpenMaps} style={styles.actionButton}>{t('delivery.openMaps')}</Button>
          {order.shipping_phone && (<Button mode="contained-tonal" icon="phone" onPress={handleCallCustomer} style={styles.actionButton}>{t('delivery.callCustomer')}</Button>)}
        </View>
      </View>

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

      {order.notes && (
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('checkout.orderNotes')}</Text>
          <Text variant="bodyMedium" style={styles.notes}>{order.notes}</Text>
        </View>
      )}

      <Card mode="elevated" style={styles.otpCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('delivery.verifyDelivery')}</Text>
          <Text variant="bodySmall" style={styles.otpHint}>{t('delivery.askCustomerForOtp')}</Text>
          <TextInput mode="outlined" label={t('delivery.enterOtp')} placeholder="1234" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={4} error={!!otpError} style={styles.otpInput} />
          {otpError ? (<Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 12 }}>{otpError}</Text>) : null}
          <Button mode="contained" buttonColor={theme.custom.success} onPress={handleVerifyOtp} loading={verifying} disabled={verifying || otp.length !== 4} contentStyle={styles.verifyButtonContent} labelStyle={styles.verifyButtonLabel}>{t('delivery.confirmDelivery')}</Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: colors.background.primary, padding: spacing.md, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: 'bold', color: colors.text.primary },
  sectionTitle: { fontWeight: '600', color: colors.text.primary, marginBottom: 12 },
  address: { color: colors.text.primary, lineHeight: 20 },
  pincode: { color: colors.text.secondary, marginTop: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: spacing.md },
  actionButton: { flex: 1 },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: '500', color: colors.text.primary },
  itemWeight: { color: colors.text.secondary },
  itemQty: { color: colors.text.secondary },
  notes: { color: colors.text.secondary, fontStyle: 'italic' },
  otpCard: { margin: spacing.md, marginBottom: spacing.xl },
  otpHint: { color: colors.text.secondary, marginBottom: spacing.md },
  otpInput: { backgroundColor: colors.background.primary, marginBottom: 12 },
  verifyButtonContent: { paddingVertical: spacing.sm },
  verifyButtonLabel: { fontSize: 16, fontWeight: '600' },
});
