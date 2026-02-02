import { View, ScrollView, StyleSheet, Linking, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Divider, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInLeft } from 'react-native-reanimated';

import { useGetOrderByIdQuery, useReorderMutation } from '../../../src/store/apiSlice';
import { formatPrice } from '../../../src/constants';
import { spacing, borderRadius, fontFamily } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme';
import { Order, PorterDelivery } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { SectionHeader } from '../../../src/components/common/SectionHeader';
import { KeyValueRow } from '../../../src/components/common/KeyValueRow';
import { AppButton } from '../../../src/components/common/AppButton';
import { hapticSuccess } from '../../../src/utils/haptics';
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
  const { appColors } = useAppTheme();
  const { data: order, isLoading, isFetching, refetch } = useGetOrderByIdQuery(id!, {
    skip: !id,
    pollingInterval: 15_000,
    refetchOnMountOrArgChange: true,
  });
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
    return <View style={[styles.centered, { backgroundColor: appColors.shell }]}><ActivityIndicator size="large" color={appColors.brand} /></View>;
  }

  const statusSteps = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const subtotal = order.subtotal_paise ?? (order.items ?? []).reduce((sum, item) => sum + (item.total_paise || item.unit_price_paise * item.quantity), 0);
  const shipping = order.shipping_paise ?? 0;
  const hasShippingBreakdown = order.subtotal_paise !== undefined;

  const isPorterDelivery = order.delivery_type === 'porter';
  const porterDelivery = order.porter_delivery;

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

      {order.status !== 'cancelled' && order.status !== 'delivery_failed' && (
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
  const { appColors } = useAppTheme();

  return (
    <View style={[styles.porterCard, { backgroundColor: appColors.surface }]}>
      <View style={styles.porterHeader}>
        <MaterialCommunityIcons name="motorbike" size={24} color={appColors.brand} />
        <Text variant="titleSmall" style={{ flex: 1, fontFamily: fontFamily.semiBold, color: appColors.text.primary }}>
          {t('orders.porterDelivery', { defaultValue: 'Porter Delivery' })}
        </Text>
        <View style={[styles.porterStatusBadge, { backgroundColor: getPorterStatusColor(porterDelivery.porter_status, appColors) }]}>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.semiBold, color: appColors.text.primary }}>{formatPorterStatus(porterDelivery.porter_status)}</Text>
        </View>
      </View>

      {porterDelivery.driver_name && (
        <Pressable onPress={() => porterDelivery.driver_phone && onCallDriver(porterDelivery.driver_phone)} style={[styles.driverCard, { backgroundColor: appColors.shell }]}>
          <View style={[styles.driverAvatar, { backgroundColor: appColors.brandLight }]}>
            <MaterialCommunityIcons name="account" size={28} color={appColors.brand} />
          </View>
          <View style={styles.driverInfo}>
            <Text variant="bodyMedium" style={{ fontFamily: fontFamily.semiBold, color: appColors.text.primary }}>{porterDelivery.driver_name}</Text>
            {porterDelivery.vehicle_number && (
              <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: 2 }}>{porterDelivery.vehicle_number}</Text>
            )}
          </View>
          {porterDelivery.driver_phone && (
            <View style={[styles.callButton, { backgroundColor: appColors.positiveLight }]}>
              <MaterialCommunityIcons name="phone" size={20} color={appColors.positive} />
            </View>
          )}
        </Pressable>
      )}

      {porterDelivery.estimated_delivery_time && (
        <View style={styles.etaRow}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={appColors.text.secondary} />
          <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>
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

function getPorterStatusColor(status: string | undefined, appColors: ReturnType<typeof useAppTheme>['appColors']): string {
  switch (status) {
    case 'allocated':
    case 'reached_for_pickup':
      return appColors.brandLight;
    case 'picked_up':
    case 'reached_for_drop':
      return appColors.positiveLight;
    case 'ended':
      return appColors.positive;
    case 'cancelled':
      return appColors.criticalLight;
    default:
      return appColors.neutralLight;
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
  // OTP Section (in-house delivery)
  otpSection: { padding: 20, marginBottom: spacing.sm, alignItems: 'center' },
  otpDigits: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  otpDigitBox: { width: 48, height: 56, borderRadius: borderRadius.md, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  // Porter Tracking Card
  porterCard: { padding: spacing.lg, marginBottom: spacing.sm },
  porterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  porterStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  driverCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, gap: spacing.md },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  driverInfo: { flex: 1 },
  callButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  etaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.xs },
  // Order Items
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  totalDivider: { marginTop: spacing.sm, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reorderContainer: { padding: spacing.lg, marginBottom: spacing.xl },
});
