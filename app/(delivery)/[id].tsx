import { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Linking, TextInput as RNTextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, Card, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import {
  useGetOrderByIdQuery,
  useVerifyDeliveryOtpMutation,
  useMarkDeliveryFailedMutation,
  useNotifyArrivalMutation,
} from '../../src/store/apiSlice';
import { formatPrice, DELIVERY_OTP_LENGTH } from '../../src/constants';
import { spacing, borderRadius, fontFamily } from '../../src/constants/theme';
import { AppButton } from '../../src/components/common/AppButton';
import { FailureReasonSheet } from '../../src/components/delivery/FailureReasonSheet';
import { hapticSuccess, hapticError, hapticLight } from '../../src/utils/haptics';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { FailureReason } from '../../src/types/delivery';

// Error code mappings
const ERROR_CODES: Record<string, string> = {
  INVALID_OTP: 'delivery.errors.invalidOtp',
  OTP_EXPIRED: 'delivery.errors.otpExpired',
  NO_OTP: 'delivery.errors.otpExpired',
  NOT_ASSIGNED: 'delivery.errors.notAssigned',
  INVALID_STATUS: 'delivery.errors.invalidStatus',
  DELIVERY_001: 'delivery.wrongDeliveryOtp',
};

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useAppTheme();
  const { appColors } = theme;
  const { data: order, isLoading } = useGetOrderByIdQuery(id!, { skip: !id });
  const [verifyDeliveryOtp, { isLoading: verifying }] = useVerifyDeliveryOtpMutation();
  const [markDeliveryFailed, { isLoading: markingFailed }] = useMarkDeliveryFailedMutation();
  const [notifyArrival, { isLoading: notifying }] = useNotifyArrivalMutation();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [showFailureSheet, setShowFailureSheet] = useState(false);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  // Success scale animation
  const successScale = useSharedValue(1);
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const otpArray = value.slice(0, DELIVERY_OTP_LENGTH).split('');
      const newOtp = [...otp];
      otpArray.forEach((char, i) => {
        if (index + i < DELIVERY_OTP_LENGTH) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + otpArray.length, DELIVERY_OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < DELIVERY_OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOpenMaps = () => {
    if (!order?.delivery_address) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`);
  };

  const handleCallCustomer = () => {
    if (!order?.shipping_phone) return;
    Linking.openURL(`tel:${order.shipping_phone}`);
  };

  const handleNotifyArrival = async () => {
    if (!id) return;
    try {
      hapticLight();
      await notifyArrival(id).unwrap();
      hapticSuccess();
    } catch (error) {
      hapticError();
    }
  };

  const handleVerifyOtp = async () => {
    if (!id) return;
    setOtpError('');
    const otpString = otp.join('');
    if (otpString.length !== DELIVERY_OTP_LENGTH) {
      setOtpError(t('delivery.otpRequired'));
      return;
    }
    try {
      await verifyDeliveryOtp({ orderId: id, otp: otpString }).unwrap();
      hapticSuccess();
      successScale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 300 })
      );
      setTimeout(() => router.replace('/(delivery)'), 1500);
    } catch (error) {
      hapticError();
      const errorCode = typeof error === 'object' && error !== null && 'data' in error
        ? String((error as { data: unknown }).data)
        : '';
      const errorKey = ERROR_CODES[errorCode] || 'common.error';
      setOtpError(t(errorKey));
    }
  };

  const handleMarkFailed = async (reason: FailureReason, notes?: string) => {
    if (!id) return;
    try {
      await markDeliveryFailed({ orderId: id, reason, notes }).unwrap();
      hapticSuccess();
      setShowFailureSheet(false);
      setTimeout(() => router.replace('/(delivery)'), 1000);
    } catch (error) {
      hapticError();
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
    <ScrollView style={[styles.container, { backgroundColor: appColors.shell }]}>
      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={[styles.orderId, { color: appColors.text.primary }]}>
            #{order.order_number || order.id.slice(0, 8)}
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontFamily: fontFamily.bold }}>
            {formatPrice(order.total_paise)}
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.secondary }]}>
          {t('checkout.deliveryAddress')}
        </Text>
        <Text variant="bodyMedium" style={[styles.address, { color: appColors.text.primary }]}>
          {order.delivery_address}
        </Text>
        <Text variant="bodySmall" style={[styles.pincode, { color: appColors.text.secondary }]}>
          {t('common.pincode')}: {order.delivery_pincode}
        </Text>
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <AppButton variant="secondary" size="md" icon="map-marker" onPress={handleOpenMaps}>
              {t('delivery.openInMaps')}
            </AppButton>
          </View>
          {order.shipping_phone && (
            <View style={{ flex: 1 }}>
              <AppButton variant="secondary" size="md" icon="phone" onPress={handleCallCustomer}>
                {t('delivery.callCustomer')}
              </AppButton>
            </View>
          )}
        </View>
        <AppButton
          variant="outline"
          size="md"
          icon="bell-ring"
          loading={notifying}
          disabled={notifying}
          onPress={handleNotifyArrival}
          style={styles.arrivalButton}
        >
          {t('delivery.arrivedNotification')}
        </AppButton>
      </View>

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.secondary }]}>
          {t('delivery.itemsToDeliver')}
        </Text>
        {order.items.map((item) => (
          <View key={item.id} style={[styles.orderItem, { borderBottomColor: appColors.border }]}>
            <View style={styles.itemInfo}>
              <Text variant="bodyMedium" style={[styles.itemName, { color: appColors.text.primary }]}>
                {item.product_name}
              </Text>
              <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>
                {item.weight_label || `${item.weight_grams}g`}
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>x{item.quantity}</Text>
          </View>
        ))}
      </View>

      {order.notes && (
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.secondary }]}>
            {t('checkout.orderNotes')}
          </Text>
          <Text variant="bodyMedium" style={[styles.notes, { color: appColors.text.secondary }]}>
            {order.notes}
          </Text>
        </View>
      )}

      <Card mode="elevated" style={styles.otpCard}>
        <LinearGradient
          colors={[appColors.positive, appColors.positive + 'CC']}
          style={styles.otpCardHeader}
        >
          <MaterialCommunityIcons name="shield-check" size={20} color={appColors.text.inverse} />
          <Text variant="titleSmall" style={[styles.otpHeaderText, { color: appColors.text.inverse }]}>
            {t('delivery.verifyDelivery')}
          </Text>
        </LinearGradient>
        <Card.Content style={styles.otpCardContent}>
          <Text variant="bodySmall" style={[styles.otpHint, { color: appColors.text.secondary }]}>
            {t('delivery.askCustomerForOtp')}
          </Text>

          <View style={styles.otpBoxes}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref: any) => { inputRefs.current[index] = ref; }}
                mode="outlined"
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                disabled={verifying}
                style={[styles.otpBox, { backgroundColor: appColors.surface }]}
                contentStyle={styles.otpBoxContent}
                outlineStyle={digit ? { borderColor: appColors.positive, borderWidth: 2 } : undefined}
              />
            ))}
          </View>

          {otpError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 12, textAlign: 'center' }}>
              {otpError}
            </Text>
          ) : null}

          <Animated.View style={successStyle}>
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              icon="check-circle"
              loading={verifying}
              disabled={verifying || otp.some((d) => !d)}
              onPress={handleVerifyOtp}
            >
              {t('delivery.confirmDelivery')}
            </AppButton>
          </Animated.View>
        </Card.Content>
      </Card>

      {/* Mark as Failed Button */}
      <View style={styles.failedContainer}>
        <AppButton
          variant="outline"
          size="lg"
          fullWidth
          icon="close-circle-outline"
          onPress={() => setShowFailureSheet(true)}
        >
          {t('delivery.markFailed')}
        </AppButton>
      </View>

      <FailureReasonSheet
        visible={showFailureSheet}
        onDismiss={() => setShowFailureSheet(false)}
        onSubmit={handleMarkFailed}
        loading={markingFailed}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { padding: spacing.lg, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontFamily: fontFamily.bold },
  sectionTitle: { fontSize: 13, fontFamily: fontFamily.semiBold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  address: { lineHeight: 20 },
  pincode: { marginTop: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: spacing.lg },
  arrivalButton: { marginTop: spacing.md },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: fontFamily.regular },
  notes: { fontStyle: 'italic' },
  otpCard: { margin: spacing.lg, marginBottom: spacing.md, overflow: 'hidden' },
  otpCardHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  otpHeaderText: { fontFamily: fontFamily.semiBold },
  otpCardContent: { padding: spacing.lg },
  otpHint: { marginBottom: spacing.lg, textAlign: 'center' },
  otpBoxes: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  otpBox: { width: 56, height: 64, borderRadius: borderRadius.md, textAlign: 'center' },
  otpBoxContent: { fontSize: 28, fontFamily: fontFamily.bold, textAlign: 'center' },
  failedContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
});
