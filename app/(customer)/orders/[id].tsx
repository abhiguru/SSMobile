import { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Divider, ActivityIndicator, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInLeft, FadeIn } from 'react-native-reanimated';

import { useGetOrderRpcQuery, useReorderMutation, useCancelOrderMutation, useGetOrderStatusHistoryQuery } from '../../../src/store/apiSlice';
import { formatPrice } from '../../../src/constants';
import { spacing, borderRadius, fontFamily, elevation } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme';
import { Order } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { SectionHeader } from '../../../src/components/common/SectionHeader';
import { AppButton } from '../../../src/components/common/AppButton';
import { FioriDialog } from '../../../src/components/common/FioriDialog';
import { hapticSuccess, hapticError } from '../../../src/utils/haptics';
import { translateCity, translateState } from '../../../src/utils/formatters';
import { LiveTrackingCard } from '../../../src/components/delivery/LiveTrackingCard';

const TIMELINE_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  placed: 'clock-outline',
  confirmed: 'check-circle-outline',
  out_for_delivery: 'truck-delivery-outline',
  delivered: 'package-variant-closed-check',
  cancelled: 'close-circle-outline',
  delivery_failed: 'alert-circle-outline',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { appColors } = useAppTheme();
  const isGujarati = i18n.language === 'gu';

  // Conditionally poll - stop for terminal statuses
  const TERMINAL_STATUSES = ['delivered', 'cancelled', 'delivery_failed'];
  const { data: order, isLoading, isFetching, refetch } = useGetOrderRpcQuery(id!, {
    skip: !id,
    refetchOnMountOrArgChange: true,
  });

  // Conditional polling subscription
  useGetOrderRpcQuery(id!, {
    skip: !id || !order || TERMINAL_STATUSES.includes(order.status),
    pollingInterval: 15_000,
  });

  const { data: statusHistory = [] } = useGetOrderStatusHistoryQuery(id!, { skip: !id });
  const [reorder, { isLoading: reorderLoading }] = useReorderMutation();
  const [cancelOrder, { isLoading: cancelLoading }] = useCancelOrderMutation();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const canCancel = order?.status === 'placed' || order?.status === 'confirmed';

  const handleReorder = async () => {
    if (!id) return;
    try {
      await reorder(id).unwrap();
      hapticSuccess();
      router.replace('/(customer)/orders');
    } catch {
      hapticError();
    }
  };

  const handleCancelOrder = async () => {
    if (!id) return;
    try {
      await cancelOrder({ orderId: id, reason: cancelReason || undefined }).unwrap();
      hapticSuccess();
      setShowCancelDialog(false);
      setCancelReason('');
    } catch {
      hapticError();
    }
  };

  const getOrderDisplayNumber = (o: Order) => o.order_number || `#${(o.id ?? '').slice(0, 8).toUpperCase()}`;

  const getDeliveryAddress = (o: Order) => {
    if (o.shipping_address_line1) {
      const city = translateCity(o.shipping_city, isGujarati);
      const state = translateState(o.shipping_state, isGujarati);
      return [o.shipping_address_line1, o.shipping_address_line2, city, state].filter(Boolean).join(', ');
    }
    return o.delivery_address || '';
  };

  const getDeliveryPincode = (o: Order) => o.shipping_pincode || o.delivery_pincode || '';

  if (isLoading || !order) {
    return (
      <View style={[styles.centered, { backgroundColor: appColors.shell }]}>
        <ActivityIndicator size="large" color={appColors.brand} />
      </View>
    );
  }

  const statusSteps = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const subtotal = order.subtotal_paise ?? (order.items ?? []).reduce((sum, item) => sum + (item.total_paise || item.unit_price_paise * item.quantity), 0);
  const shipping = order.shipping_paise ?? 0;
  const hasShippingBreakdown = order.subtotal_paise !== undefined;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: appColors.shell }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={appColors.brand} colors={[appColors.brand]} />}
    >
      {/* Order Header Card */}
      <View style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border }, elevation.level1]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text variant="titleMedium" style={[styles.orderId, { color: appColors.text.primary }]}>
              {getOrderDisplayNumber(order)}
            </Text>
            <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: spacing.xs }}>
              {new Date(order.created_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <StatusBadge status={order.status} />
        </View>

        {/* Estimated Delivery Time */}
        {order.estimated_delivery_at && !['placed', 'cancelled', 'delivery_failed'].includes(order.status) && (
          <View style={[styles.estimatedDeliveryBadge, { backgroundColor: appColors.positiveLight }]}>
            <MaterialCommunityIcons name="calendar-check" size={16} color={appColors.positive} />
            <Text variant="bodySmall" style={[styles.estimatedDeliveryText, { color: appColors.positive }]}>
              {t('orders.estimatedDelivery', {
                date: new Date(order.estimated_delivery_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }),
              })}
            </Text>
          </View>
        )}
      </View>

      {/* Order Progress Timeline */}
      {order.status !== 'cancelled' && order.status !== 'delivery_failed' && (
        <View style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border }, elevation.level1]}>
          <SectionHeader title={t('orders.trackOrder')} style={styles.sectionHeaderInCard} />
          <View style={styles.timeline}>
            {statusSteps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const iconName = TIMELINE_ICONS[step] || 'circle';
              const historyEntry = statusHistory.find((h) => h.status === step);
              const timestamp = historyEntry
                ? new Date(historyEntry.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : null;

              return (
                <Animated.View
                  key={step}
                  entering={FadeInLeft.delay(index * 100).duration(300)}
                  style={styles.timelineStep}
                >
                  {/* Connector Line */}
                  {index < statusSteps.length - 1 && (
                    <View
                      style={[
                        styles.timelineConnector,
                        { backgroundColor: index < currentStepIndex ? appColors.positive : appColors.border },
                      ]}
                    />
                  )}

                  {/* Dot */}
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: isActive
                          ? isCurrent
                            ? appColors.brand
                            : appColors.positive
                          : appColors.neutralLight,
                        borderColor: isActive
                          ? isCurrent
                            ? appColors.brand
                            : appColors.positive
                          : appColors.border,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={iconName}
                      size={14}
                      color={isActive ? appColors.text.inverse : appColors.neutral}
                    />
                  </View>

                  {/* Label */}
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.timelineLabel,
                      { color: isActive ? appColors.text.primary : appColors.neutral },
                      isActive && { fontFamily: fontFamily.semiBold },
                    ]}
                  >
                    {t(`status.${step}`)}
                  </Text>

                  {/* Timestamp */}
                  {timestamp && (
                    <Text variant="labelSmall" style={[styles.timelineTimestamp, { color: appColors.text.secondary }]}>
                      {timestamp}
                    </Text>
                  )}
                </Animated.View>
              );
            })}
          </View>
        </View>
      )}

      {/* Delivery OTP Card */}
      {order.status === 'out_for_delivery' && order.delivery_otp && (
        <Animated.View
          entering={FadeIn.duration(400)}
          style={[styles.otpCard, { backgroundColor: appColors.positiveLight, borderColor: appColors.positive }]}
        >
          <View style={styles.otpHeader}>
            <MaterialCommunityIcons name="shield-check" size={20} color={appColors.positive} />
            <Text variant="titleSmall" style={[styles.otpTitle, { color: appColors.positive }]}>
              {t('orders.deliveryOtp')}
            </Text>
          </View>

          <View style={styles.otpDigits}>
            {order.delivery_otp.split('').map((digit, i) => (
              <Animated.View
                key={i}
                entering={FadeInLeft.delay(i * 80).duration(250)}
                style={[styles.otpDigitBox, { borderColor: appColors.positive, backgroundColor: appColors.surface }]}
              >
                <Text variant="headlineMedium" style={[styles.otpDigit, { color: appColors.positive }]}>
                  {digit}
                </Text>
              </Animated.View>
            ))}
          </View>

          <Text variant="bodySmall" style={{ color: appColors.text.secondary, textAlign: 'center' }}>
            {t('orders.shareOtpHint')}
          </Text>
        </Animated.View>
      )}

      {/* Live Tracking */}
      {order.status === 'out_for_delivery' && (
        <View style={styles.trackingContainer}>
          <LiveTrackingCard orderId={id!} />
        </View>
      )}

      {/* Order Items Card */}
      <View style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border, padding: 0, overflow: 'hidden' }, elevation.level2]}>
        <View style={styles.cardBody}>
          <SectionHeader
            title={`${t('orders.itemsTitle')} (${order.items?.length ?? 0})`}
            style={styles.sectionHeaderInCard}
          />

          {(order.items ?? []).map((item, idx) => {
            const isLast = idx === (order.items?.length ?? 0) - 1;
            return (
              <View
                key={item.id}
                style={[
                  styles.orderItem,
                  { borderBottomColor: appColors.border },
                  isLast && styles.orderItemLast,
                ]}
              >
                <View style={styles.itemInfo}>
                  <Text variant="bodyMedium" style={[styles.itemName, { color: appColors.text.primary }]}>
                    {isGujarati && item.product_name_gu ? item.product_name_gu : item.product_name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: 2 }}>
                    {item.weight_label || `${item.weight_grams}g`}
                  </Text>
                </View>
                <View style={[styles.qtyBadge, { backgroundColor: appColors.informativeLight }]}>
                  <Text variant="labelSmall" style={[styles.qtyText, { color: appColors.informative }]}>
                    x{item.quantity}
                  </Text>
                </View>
                <Text variant="bodyMedium" style={[styles.itemPrice, { color: appColors.text.primary }]}>
                  {formatPrice(item.total_paise || item.unit_price_paise * item.quantity)}
                </Text>
              </View>
            );
          })}

          {/* Price Breakdown */}
          {hasShippingBreakdown && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.breakdownRow}>
                <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>{t('checkout.subtotal')}</Text>
                <Text variant="bodyMedium" style={[styles.breakdownValue, { color: appColors.text.primary }]}>
                  {formatPrice(subtotal)}
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>{t('checkout.shipping')}</Text>
                {shipping === 0 ? (
                  <View style={styles.freeShippingBadge}>
                    <MaterialCommunityIcons name="check-circle" size={14} color={appColors.positive} />
                    <Text variant="bodyMedium" style={{ color: appColors.positive, fontFamily: fontFamily.bold, marginLeft: spacing.xs }}>
                      {t('checkout.free')}
                    </Text>
                  </View>
                ) : (
                  <Text variant="bodyMedium" style={[styles.breakdownValue, { color: appColors.text.primary }]}>
                    {formatPrice(shipping)}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* Total Footer */}
        <View style={[styles.totalFooter, { backgroundColor: appColors.brandTint, borderTopColor: appColors.border }]}>
          <Text variant="titleSmall" style={{ fontFamily: fontFamily.semiBold, color: appColors.text.primary }}>
            {t('cart.total')}
          </Text>
          <Text variant="headlineSmall" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>
            {formatPrice(order.total_paise)}
          </Text>
        </View>
      </View>

      {/* Delivery Address Card */}
      <View style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border }, elevation.level1]}>
        <SectionHeader title={t('checkout.deliveryAddress')} style={styles.sectionHeaderInCard} />
        <View style={styles.addressContent}>
          <MaterialCommunityIcons name="map-marker" size={18} color={appColors.brand} style={styles.addressIcon} />
          <View style={styles.addressText}>
            {order.shipping_full_name && (
              <Text variant="bodyMedium" style={[styles.addressName, { color: appColors.text.primary }]}>
                {order.shipping_full_name}
              </Text>
            )}
            <Text variant="bodyMedium" style={{ color: appColors.text.primary, lineHeight: 20 }}>
              {getDeliveryAddress(order)}
            </Text>
            <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: spacing.xs }}>
              {t('common.pincode')}: {getDeliveryPincode(order)}
            </Text>
            {order.shipping_phone && (
              <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: spacing.xs }}>
                {order.shipping_phone}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Order Notes Card */}
      {order.notes && (
        <View style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border }, elevation.level1]}>
          <SectionHeader title={t('checkout.orderNotes')} style={styles.sectionHeaderInCard} />
          <View style={[styles.notesContent, { backgroundColor: appColors.fieldBackground }]}>
            <MaterialCommunityIcons name="note-text-outline" size={16} color={appColors.text.secondary} />
            <Text variant="bodyMedium" style={[styles.notesText, { color: appColors.text.secondary }]}>
              {order.notes}
            </Text>
          </View>
        </View>
      )}

      {/* Admin Notes Card */}
      {order.admin_notes && (
        <View style={[styles.card, { backgroundColor: appColors.surface, borderColor: appColors.border }, elevation.level1]}>
          <SectionHeader title={t('admin.adminNotes')} style={styles.sectionHeaderInCard} />
          <View style={[styles.notesContent, { backgroundColor: appColors.informativeLight }]}>
            <MaterialCommunityIcons name="information-outline" size={16} color={appColors.informative} />
            <Text variant="bodyMedium" style={[styles.notesText, { color: appColors.informative }]}>
              {order.admin_notes}
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Cancel Button */}
        {canCancel && (
          <AppButton
            variant="outline"
            size="lg"
            fullWidth
            icon="close-circle-outline"
            loading={cancelLoading}
            disabled={cancelLoading}
            onPress={() => setShowCancelDialog(true)}
            style={styles.actionButton}
          >
            {t('orders.cancelOrder')}
          </AppButton>
        )}

        {/* Reorder Button */}
        {(order.status === 'delivered' || order.status === 'cancelled') && (
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            icon="refresh"
            loading={reorderLoading}
            disabled={reorderLoading}
            onPress={handleReorder}
            style={styles.actionButton}
          >
            {t('orders.reorder')}
          </AppButton>
        )}
      </View>

      {/* Cancel Confirmation Dialog */}
      <FioriDialog
        visible={showCancelDialog}
        onDismiss={() => setShowCancelDialog(false)}
        title={t('orders.cancelConfirmTitle')}
        actions={[
          { label: t('common.cancel'), onPress: () => setShowCancelDialog(false), variant: 'text' },
          { label: t('common.confirm'), onPress: handleCancelOrder, variant: 'danger' },
        ]}
      >
        <Text variant="bodyMedium" style={{ color: appColors.text.secondary, marginBottom: spacing.md }}>
          {t('orders.cancelConfirmMessage')}
        </Text>
        <TextInput
          label={t('orders.cancelReason')}
          placeholder={t('orders.cancelReasonPlaceholder')}
          value={cancelReason}
          onChangeText={setCancelReason}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={{ backgroundColor: appColors.surface }}
          outlineColor={appColors.fieldBorder}
          activeOutlineColor={appColors.brand}
        />
      </FioriDialog>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card (Fiori Object Cell)
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardBody: {
    padding: spacing.lg,
  },
  sectionHeaderInCard: {
    paddingHorizontal: 0,
    marginBottom: spacing.sm,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  orderId: {
    fontFamily: fontFamily.bold,
  },
  estimatedDeliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  estimatedDeliveryText: {
    marginLeft: spacing.sm,
    fontFamily: fontFamily.semiBold,
  },

  // Timeline
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineConnector: {
    position: 'absolute',
    left: '50%',
    top: 13,
    width: '100%',
    height: 2,
    zIndex: 0,
  },
  timelineLabel: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: 10,
  },
  timelineTimestamp: {
    textAlign: 'center',
    fontSize: 9,
    marginTop: 2,
  },

  // OTP Card
  otpCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  otpTitle: {
    marginLeft: spacing.sm,
    fontFamily: fontFamily.semiBold,
  },
  otpDigits: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  otpDigitBox: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpDigit: {
    fontFamily: fontFamily.bold,
  },

  // Live Tracking
  trackingContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Order Items
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  orderItemLast: {
    borderBottomWidth: 0,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: fontFamily.semiBold,
  },
  qtyBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.sm,
    minWidth: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: fontFamily.semiBold,
  },
  itemPrice: {
    fontFamily: fontFamily.semiBold,
    minWidth: 64,
    textAlign: 'right',
  },

  // Breakdown
  divider: {
    marginVertical: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
  },
  breakdownValue: {
    fontFamily: fontFamily.semiBold,
  },
  freeShippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Total Footer
  totalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },

  // Address
  addressContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
  },
  addressName: {
    fontFamily: fontFamily.semiBold,
    marginBottom: spacing.xs,
  },

  // Notes
  notesContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  notesText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.xs,
  },
});
