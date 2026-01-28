import { View, ScrollView, StyleSheet, Linking, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Divider, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInLeft } from 'react-native-reanimated';

import { useGetOrderByIdQuery, useReorderMutation } from '../../../src/store/apiSlice';
import { formatPrice, ORDER_STATUS_COLORS } from '../../../src/constants';
import { colors, spacing, borderRadius, fontFamily } from '../../../src/constants/theme';
import { Order, PorterDelivery } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { AppButton } from '../../../src/components/common/AppButton';
import { hapticSuccess } from '../../../src/utils/haptics';
import type { AppTheme } from '../../../src/theme';

const TIMELINE_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  placed: 'clock-outline',
  confirmed: 'check-circle-outline',
  out_for_delivery: 'truck-delivery-outline',
  delivered: 'package-variant-closed-check',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: order, isLoading } = useGetOrderByIdQuery(id!, { skip: !id });
  const [reorder, { isLoading: reorderLoading }] = useReorderMutation();

  const handleReorder = async () => {
    if (!id) return;
    try {
      await reorder(id).unwrap();
      hapticSuccess();
      router.replace('/(customer)/orders');
    } catch { /* handled by RTK Query */ }
  };

  const getOrderDisplayNumber = (o: Order) => o.order_number || `#${(o.id ?? '').slice(0, 8).toUpperCase()}`;

  const getDeliveryAddress = (o: Order) => {
    if (o.shipping_address_line1) {
      return [o.shipping_address_line1, o.shipping_address_line2, o.shipping_city, o.shipping_state].filter(Boolean).join(', ');
    }
    return o.delivery_address || '';
  };

  const getDeliveryPincode = (o: Order) => o.shipping_pincode || o.delivery_pincode || '';

  const openTrackingUrl = (url: string) => {
    Linking.openURL(url);
  };

  const callDriver = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (isLoading || !order) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  const statusSteps = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const subtotal = order.subtotal_paise ?? (order.items ?? []).reduce((sum, item) => sum + (item.total_paise || item.unit_price_paise * item.quantity), 0);
  const shipping = order.shipping_paise ?? 0;
  const hasShippingBreakdown = order.subtotal_paise !== undefined;

  const isPorterDelivery = order.delivery_type === 'porter';
  const porterDelivery = order.porter_delivery;

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
            {statusSteps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const iconName = TIMELINE_ICONS[step] || 'circle';
              return (
                <Animated.View
                  key={step}
                  entering={FadeInLeft.delay(index * 150).duration(400)}
                  style={styles.timelineStep}
                >
                  <View style={[styles.timelineDot, isActive && styles.timelineDotActive]}>
                    <MaterialCommunityIcons
                      name={iconName}
                      size={16}
                      color={isActive ? colors.text.inverse : colors.neutral}
                    />
                  </View>
                  {index < statusSteps.length - 1 && (
                    <View style={[styles.timelineLine, index < currentStepIndex && styles.timelineLineActive]} />
                  )}
                  <Text variant="labelSmall" style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>
                    {t(`status.${step}`)}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        </View>
      )}

      {/* Porter Tracking Card */}
      {order.status === 'out_for_delivery' && isPorterDelivery && porterDelivery && (
        <PorterTrackingCard
          porterDelivery={porterDelivery}
          onTrack={openTrackingUrl}
          onCallDriver={callDriver}
        />
      )}

      {/* In-house Delivery OTP */}
      {order.status === 'out_for_delivery' && !isPorterDelivery && order.delivery_otp && (
        <View style={styles.otpSection}>
          <Text variant="bodyMedium" style={styles.otpLabel}>{t('orders.deliveryOtp')}</Text>
          <View style={styles.otpDigits}>
            {order.delivery_otp.split('').map((digit, i) => (
              <Animated.View
                key={i}
                entering={FadeInLeft.delay(i * 100).duration(300)}
                style={styles.otpDigitBox}
              >
                <Text variant="headlineMedium" style={styles.otpDigitText}>{digit}</Text>
              </Animated.View>
            ))}
          </View>
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
              {shipping === 0 ? <Text variant="bodyMedium" style={{ color: colors.positive, fontFamily: fontFamily.semiBold }}>{t('checkout.free')}</Text> : <Text variant="bodyMedium">{formatPrice(shipping)}</Text>}
            </View>
          </>
        )}
        <Divider style={styles.totalDivider} />
        <View style={styles.totalRow}>
          <Text variant="titleSmall">{t('cart.total')}</Text>
          <Text variant="titleMedium" style={{ color: colors.brand, fontFamily: fontFamily.bold }}>{formatPrice(order.total_paise)}</Text>
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
    </ScrollView>
  );
}

// Porter Tracking Card Component
function PorterTrackingCard({
  porterDelivery,
  onTrack,
  onCallDriver,
}: {
  porterDelivery: PorterDelivery;
  onTrack: (url: string) => void;
  onCallDriver: (phone: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.porterCard}>
      <View style={styles.porterHeader}>
        <MaterialCommunityIcons name="motorbike" size={24} color={colors.brand} />
        <Text variant="titleSmall" style={styles.porterTitle}>
          {t('orders.porterDelivery', { defaultValue: 'Porter Delivery' })}
        </Text>
        <View style={[styles.porterStatusBadge, { backgroundColor: getPorterStatusColor(porterDelivery.porter_status) }]}>
          <Text style={styles.porterStatusText}>{formatPorterStatus(porterDelivery.porter_status)}</Text>
        </View>
      </View>

      {porterDelivery.driver_name && (
        <Pressable onPress={() => porterDelivery.driver_phone && onCallDriver(porterDelivery.driver_phone)} style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <MaterialCommunityIcons name="account" size={28} color={colors.brand} />
          </View>
          <View style={styles.driverInfo}>
            <Text variant="bodyMedium" style={styles.driverName}>{porterDelivery.driver_name}</Text>
            {porterDelivery.vehicle_number && (
              <Text variant="bodySmall" style={styles.vehicleNumber}>{porterDelivery.vehicle_number}</Text>
            )}
          </View>
          {porterDelivery.driver_phone && (
            <View style={styles.callButton}>
              <MaterialCommunityIcons name="phone" size={20} color={colors.positive} />
            </View>
          )}
        </Pressable>
      )}

      {porterDelivery.estimated_delivery_time && (
        <View style={styles.etaRow}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={colors.text.secondary} />
          <Text variant="bodySmall" style={styles.etaText}>
            {t('orders.estimatedDelivery', { defaultValue: 'Estimated delivery' })}: {formatTime(porterDelivery.estimated_delivery_time)}
          </Text>
        </View>
      )}

      {porterDelivery.tracking_url && (
        <AppButton
          variant="primary"
          size="md"
          fullWidth
          icon="map-marker"
          onPress={() => onTrack(porterDelivery.tracking_url!)}
          style={{ marginTop: spacing.md }}
        >
          {t('orders.trackDelivery', { defaultValue: 'Track Delivery' })}
        </AppButton>
      )}
    </View>
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
      return 'Finding driver...';
    case 'allocated':
      return 'Driver assigned';
    case 'reached_for_pickup':
      return 'At store';
    case 'picked_up':
      return 'Picked up';
    case 'reached_for_drop':
      return 'Arriving soon';
    case 'ended':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || 'Processing';
  }
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: colors.surface, padding: spacing.lg, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontFamily: fontFamily.bold, color: colors.text.primary },
  date: { color: colors.text.secondary },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  timeline: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineStep: { alignItems: 'center', flex: 1 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  timelineDotActive: { backgroundColor: colors.positive },
  timelineLine: { position: 'absolute', left: '50%', top: 16, width: '100%', height: 2, backgroundColor: colors.border, zIndex: -1 },
  timelineLineActive: { backgroundColor: colors.positive },
  timelineLabel: { color: colors.neutral, marginTop: spacing.sm, textAlign: 'center', fontSize: 10 },
  timelineLabelActive: { color: colors.text.primary, fontFamily: fontFamily.semiBold },
  // OTP Section (in-house delivery)
  otpSection: { backgroundColor: colors.positiveLight, padding: 20, marginBottom: spacing.sm, alignItems: 'center' },
  otpLabel: { color: colors.text.secondary, marginBottom: spacing.sm },
  otpDigits: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  otpDigitBox: { width: 48, height: 56, borderRadius: borderRadius.md, borderWidth: 2, borderColor: colors.positive, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  otpDigitText: { fontFamily: fontFamily.bold, color: colors.positive },
  otpHint: { color: colors.text.secondary },
  // Porter Tracking Card
  porterCard: { backgroundColor: colors.surface, padding: spacing.lg, marginBottom: spacing.sm },
  porterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  porterTitle: { flex: 1, fontFamily: fontFamily.semiBold, color: colors.text.primary },
  porterStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  porterStatusText: { fontSize: 11, fontFamily: fontFamily.semiBold, color: colors.text.primary },
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.shell, padding: spacing.md, borderRadius: borderRadius.md, gap: spacing.md },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandLight, justifyContent: 'center', alignItems: 'center' },
  driverInfo: { flex: 1 },
  driverName: { fontFamily: fontFamily.semiBold, color: colors.text.primary },
  vehicleNumber: { color: colors.text.secondary, marginTop: 2 },
  callButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.positiveLight, justifyContent: 'center', alignItems: 'center' },
  etaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.xs },
  etaText: { color: colors.text.secondary },
  // Order Items
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: '500', color: colors.text.primary },
  itemWeight: { color: colors.text.secondary },
  itemQty: { color: colors.text.secondary, marginHorizontal: spacing.md },
  itemPrice: { fontFamily: fontFamily.semiBold, color: colors.text.primary },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  breakdownLabel: { color: colors.text.secondary },
  totalDivider: { marginTop: spacing.sm, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // Address
  addressName: { fontFamily: fontFamily.semiBold, color: colors.text.primary, marginBottom: spacing.xs },
  address: { color: colors.text.primary, lineHeight: 20 },
  pincode: { color: colors.text.secondary, marginTop: spacing.xs },
  phone: { color: colors.text.secondary, marginTop: spacing.xs },
  notes: { color: colors.text.secondary, fontStyle: 'italic' },
  reorderContainer: { padding: spacing.lg, marginBottom: spacing.xl },
});
