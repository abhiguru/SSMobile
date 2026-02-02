import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Linking, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import {
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useUpdateOrderNotesMutation,
  useUpdateOrderItemsMutation,
  useGetProductsQuery,
  useGetPorterQuoteMutation,
  useBookPorterDeliveryMutation,
  useCancelPorterDeliveryMutation,
  useDispatchOrderMutation,
} from '../../../src/store/apiSlice';
import { formatPrice, getPerKgPaise, getOrderStatusColor } from '../../../src/constants';
import { spacing, fontFamily, borderRadius } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme/useAppTheme';
import { OrderStatus, DeliveryType, PorterQuoteResponse, DeliveryStaff, OrderItem, Product } from '../../../src/types';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { SectionHeader } from '../../../src/components/common/SectionHeader';
import { KeyValueRow } from '../../../src/components/common/KeyValueRow';
import { AppButton } from '../../../src/components/common/AppButton';
import { DeliveryStaffPicker } from '../../../src/components/common/DeliveryStaffPicker';
import { EditOrderItemSheet } from '../../../src/components/common/EditOrderItemSheet';
import { AddOrderItemSheet, AddOrderItemResult } from '../../../src/components/common/AddOrderItemSheet';
import { useToast } from '../../../src/components/common/Toast';
import { FioriDialog } from '../../../src/components/common/FioriDialog';
import { hapticSuccess, hapticError } from '../../../src/utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';

interface EditableItem {
  product_id: string;
  product_name: string;
  product_name_gu: string;
  weight_grams: number;
  quantity: number;
  unit_price_paise: number;
}

const STATUS_ACTIONS: Record<string, OrderStatus[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: [], // Handled by delivery type selector
  out_for_delivery: ['delivered', 'delivery_failed'],
};

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { appColors } = useAppTheme();
  const { data: order, isLoading, refetch } = useGetOrderByIdQuery(id!, {
    skip: !id,
    pollingInterval: 15_000,
  });
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [getPorterQuote, { isLoading: quoteLoading }] = useGetPorterQuoteMutation();
  const [bookPorterDelivery, { isLoading: bookingPorter }] = useBookPorterDeliveryMutation();
  const [cancelPorterDelivery, { isLoading: cancellingPorter }] = useCancelPorterDeliveryMutation();
  const [dispatchOrder, { isLoading: dispatching }] = useDispatchOrderMutation();

  const [updateOrderNotes, { isLoading: savingNotes }] = useUpdateOrderNotesMutation();
  const [updateOrderItems, { isLoading: savingItems }] = useUpdateOrderItemsMutation();
  const { data: allProducts = [] } = useGetProductsQuery({ includeUnavailable: false });

  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void; confirmLabel: string; variant?: ButtonVariant } | null>(null);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('porter');
  const [porterQuote, setPorterQuote] = useState<PorterQuoteResponse['quote'] | null>(null);
  const [staffPickerVisible, setStaffPickerVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');

  // Edit items state
  const [editing, setEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<EditableItem[]>([]);
  const [editingItem, setEditingItem] = useState<{ orderItem: OrderItem; product: Product } | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => {
    if (order) {
      const notes = order.admin_notes ?? '';
      setAdminNotes(notes);
      setSavedNotes(notes);
    }
  }, [order?.admin_notes]);

  const handleSaveNotes = async () => {
    if (!id) return;
    try {
      await updateOrderNotes({ orderId: id, admin_notes: adminNotes }).unwrap();
      setSavedNotes(adminNotes);
      hapticSuccess();
      showToast({ message: t('admin.notesSaved'), type: 'success' });
    } catch {
      hapticError();
      showToast({ message: t('admin.notesSaveFailed'), type: 'error' });
    }
  };

  const canEditItems = order?.status === 'placed' || order?.status === 'confirmed';

  const handleEnterEditMode = () => {
    if (!order) return;
    setEditedItems(
      (order.items ?? []).map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_name_gu: item.product_name_gu,
        weight_grams: item.weight_grams,
        quantity: item.quantity,
        unit_price_paise: item.unit_price_paise,
      }))
    );
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditedItems([]);
  };

  const handleEditItem = (editableItem: EditableItem) => {
    const product = allProducts.find((p) => p.id === editableItem.product_id);
    if (!product) return;
    const orderItem: OrderItem = {
      id: '',
      order_id: order?.id ?? '',
      product_id: editableItem.product_id,
      weight_option_id: '',
      quantity: editableItem.quantity,
      unit_price_paise: editableItem.unit_price_paise,
      total_paise: editableItem.unit_price_paise * editableItem.quantity,
      product_name: editableItem.product_name,
      product_name_gu: editableItem.product_name_gu,
      weight_grams: editableItem.weight_grams,
    };
    setEditingItem({ orderItem, product });
  };

  const handleUpdateEditedItem = (productId: string, weightGrams: number, quantity: number) => {
    setEditedItems((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        const product = allProducts.find((p) => p.id === productId);
        const perKgPaise = product ? getPerKgPaise(product) : 0;
        const unitPrice = Math.round(perKgPaise * weightGrams / 1000);
        return { ...item, weight_grams: weightGrams, quantity, unit_price_paise: unitPrice };
      })
    );
    setEditingItem(null);
  };

  const handleRemoveEditedItem = (productId: string) => {
    setDialog({
      title: t('admin.removeItem'),
      message: t('admin.removeItemConfirm'),
      confirmLabel: t('admin.removeItem'),
      variant: 'danger',
      onConfirm: () => {
        setDialog(null);
        setEditedItems((prev) => prev.filter((item) => item.product_id !== productId));
      },
    });
  };

  const handleAddOrderItem = (result: AddOrderItemResult) => {
    setEditedItems((prev) => [...prev, result]);
    setAddingItem(false);
  };

  const handleSaveItems = async () => {
    if (!id) return;
    if (editedItems.length === 0) {
      showToast({ message: t('admin.noItems'), type: 'error' });
      return;
    }
    try {
      await updateOrderItems({
        orderId: id,
        items: editedItems.map((item) => ({
          product_id: item.product_id,
          weight_grams: item.weight_grams,
          quantity: item.quantity,
        })),
      }).unwrap();
      hapticSuccess();
      showToast({ message: t('admin.itemsSaved'), type: 'success' });
      setEditing(false);
      setEditedItems([]);
    } catch {
      hapticError();
      showToast({ message: t('admin.itemsSaveFailed'), type: 'error' });
    }
  };

  const editedTotal = editedItems.reduce(
    (sum, item) => sum + item.unit_price_paise * item.quantity,
    0
  );

  const handleStatusUpdate = (newStatus: OrderStatus) => {
    const isDanger = newStatus === 'cancelled' || newStatus === 'delivery_failed';

    const doUpdate = async () => {
      if (!id) return;
      try {
        await updateOrderStatus({ orderId: id, status: newStatus }).unwrap();
        hapticSuccess();
        showToast({ message: t(`status.${newStatus}`), type: 'success' });
      } catch (err: unknown) {
        hapticError();
        const errorData = (err as { data?: string })?.data;
        showToast({ message: errorData || t('common.error'), type: 'error' });
      }
    };

    if (isDanger) {
      setDialog({
        title: t('admin.confirmStatusUpdate'),
        message: t('admin.updateStatusTo', { status: t(`status.${newStatus}`) }),
        confirmLabel: t('common.confirm'),
        variant: 'danger',
        onConfirm: () => { setDialog(null); doUpdate(); },
      });
    } else {
      doUpdate();
    }
  };

  const handleGetPorterQuote = async () => {
    if (!id) return;
    try {
      const result = await getPorterQuote(id).unwrap();
      if (result.success) {
        setPorterQuote(result.quote);
        hapticSuccess();
      } else {
        hapticError();
        showToast({ message: result.message || 'Failed to get quote', type: 'error' });
      }
    } catch (err: unknown) {
      hapticError();
      const errorData = (err as { data?: string })?.data;
      showToast({ message: errorData || 'Failed to get Porter quote', type: 'error' });
    }
  };

  const handleBookPorter = () => {
    if (!id) return;
    setDialog({
      title: 'Book Porter Delivery',
      message: `Estimated fare: ${porterQuote?.fare_display || 'N/A'}\nETA: ${porterQuote?.estimated_time_display || 'N/A'}`,
      confirmLabel: 'Book Porter',
      variant: 'primary',
      onConfirm: async () => {
        setDialog(null);
        try {
          const result = await bookPorterDelivery(id).unwrap();
          if (result.success) {
            hapticSuccess();
            showToast({ message: 'Porter delivery booked!', type: 'success' });
            setPorterQuote(null);
            refetch();
          } else {
            hapticError();
            showToast({ message: result.message || 'Booking failed', type: 'error' });
          }
        } catch (err: unknown) {
          hapticError();
          const errorData = (err as { data?: string })?.data;
          showToast({ message: errorData || 'Failed to book Porter', type: 'error' });
        }
      },
    });
  };

  const handleCancelPorter = (fallbackToInhouse: boolean) => {
    if (!id) return;
    const title = fallbackToInhouse ? 'Cancel & Reassign' : 'Cancel Porter';
    const message = fallbackToInhouse
      ? 'Cancel Porter delivery and return order to dispatch queue?'
      : 'Cancel Porter delivery? Order will be marked as delivery failed.';

    setDialog({
      title,
      message,
      confirmLabel: 'Confirm',
      variant: 'danger',
      onConfirm: async () => {
        setDialog(null);
        try {
          await cancelPorterDelivery({
            orderId: id,
            reason: fallbackToInhouse ? 'Reassigning to in-house' : 'Cancelled by admin',
            fallbackToInhouse,
          }).unwrap();
          hapticSuccess();
          showToast({
            message: fallbackToInhouse ? 'Order returned to dispatch queue' : 'Porter cancelled',
            type: 'success',
          });
          refetch();
        } catch (err: unknown) {
          hapticError();
          const errorData = (err as { data?: string })?.data;
          showToast({ message: errorData || 'Failed to cancel', type: 'error' });
        }
      },
    });
  };

  const handleDispatchInHouse = () => {
    if (!id) return;
    setStaffPickerVisible(true);
  };

  const handleStaffSelected = async (staff: DeliveryStaff) => {
    if (!id) return;
    try {
      await dispatchOrder({ orderId: id, deliveryStaffId: staff.id }).unwrap();
      hapticSuccess();
      showToast({ message: `Order dispatched to ${staff.name}`, type: 'success' });
      setStaffPickerVisible(false);
      refetch();
    } catch (err: unknown) {
      hapticError();
      const errorData = (err as { data?: string })?.data;
      showToast({ message: errorData || 'Failed to dispatch order', type: 'error' });
    }
  };

  const openTrackingUrl = () => {
    if (order?.porter_delivery?.tracking_url) {
      Linking.openURL(order.porter_delivery.tracking_url);
    }
  };

  const callDriver = () => {
    if (order?.porter_delivery?.driver_phone) {
      Linking.openURL(`tel:${order.porter_delivery.driver_phone}`);
    }
  };

  const getPorterStatusColor = (status?: string): string => {
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
  };

  if (isLoading || !order) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={appColors.brand} /></View>);
  }

  const availableActions = STATUS_ACTIONS[order.status] || [];
  const stripeColor = getOrderStatusColor(order.status, appColors);
  const isConfirmed = order.status === 'confirmed';
  const isOutForDelivery = order.status === 'out_for_delivery';
  const isPorterDelivery = order.delivery_type === 'porter';
  const porterDelivery = order.porter_delivery;

  return (
    <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={[styles.container, { backgroundColor: appColors.shell }]} keyboardShouldPersistTaps="handled">
      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerStripe, { backgroundColor: stripeColor }]} />
            <Text variant="titleMedium" style={[styles.orderId, { color: appColors.text.primary }]}>#{order.id.slice(0, 8)}</Text>
          </View>
          <StatusBadge status={order.status} />
        </View>
        <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{new Date(order.created_at).toLocaleString()}</Text>
        {order.delivery_type && (
          <View style={styles.deliveryTypeBadge}>
            <MaterialCommunityIcons
              name={order.delivery_type === 'porter' ? 'motorbike' : 'account'}
              size={14}
              color={appColors.text.secondary}
            />
            <Text variant="labelSmall" style={{ color: appColors.text.secondary }}>
              {order.delivery_type === 'porter' ? 'Porter Delivery' : 'In-House Delivery'}
            </Text>
          </View>
        )}
      </View>

      {/* Customer info */}
      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <SectionHeader
          title={t('admin.customer')}
          style={{ paddingHorizontal: 0 }}
          actionLabel={order.customer ? t('admin.viewHistory') : undefined}
          onAction={order.customer ? () => router.push({
            pathname: '/(admin)/orders/user-history',
            params: { userId: order.customer!.id, userName: order.customer!.name || '' },
          }) : undefined}
        />
        {order.customer ? (
          <Pressable
            onPress={() => order.customer?.phone && Linking.openURL(`tel:${order.customer.phone}`)}
            disabled={!order.customer.phone}
            style={[styles.customerCard, { backgroundColor: appColors.shell }]}
          >
            <MaterialCommunityIcons name="account" size={24} color={appColors.brand} />
            <View style={styles.customerInfo}>
              <Text variant="bodyMedium" style={{ fontFamily: fontFamily.semiBold, color: appColors.text.primary }}>
                {order.customer.name || t('admin.noCustomerInfo')}
              </Text>
              {order.customer.phone && (
                <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{order.customer.phone}</Text>
              )}
            </View>
            {order.customer.phone && (
              <MaterialCommunityIcons name="phone" size={24} color={appColors.positive} />
            )}
          </Pressable>
        ) : (
          <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>
            {t('admin.noCustomerInfo')}
          </Text>
        )}
      </View>

      {/* Standard status actions for placed orders */}
      {order.status === 'placed' && (
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <SectionHeader title={t('admin.updateStatus')} style={{ paddingHorizontal: 0 }} />
          <View style={styles.actionsRow}>
            {availableActions.map((status) => {
              const isDanger = status === 'cancelled' || status === 'delivery_failed';
              return (
                <View key={status} style={styles.actionButtonWrapper}>
                  <AppButton
                    variant={isDanger ? 'danger' : 'primary'}
                    size="md"
                    fullWidth
                    onPress={() => handleStatusUpdate(status)}
                  >
                    {t(`status.${status}`)}
                  </AppButton>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Delivery type selector for confirmed orders */}
      {isConfirmed && (
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <SectionHeader title="Dispatch Order" style={{ paddingHorizontal: 0 }} />

          <SegmentedButtons
            value={deliveryType}
            onValueChange={(v) => {
              setDeliveryType(v as DeliveryType);
              setPorterQuote(null);
            }}
            buttons={[
              { value: 'porter', label: 'Porter', icon: 'motorbike' },
              { value: 'in_house', label: 'In-House', icon: 'account' },
            ]}
            style={styles.segmentedButtons}
          />

          {deliveryType === 'porter' && (
            <View style={styles.porterSection}>
              {!porterQuote ? (
                <AppButton
                  variant="secondary"
                  size="md"
                  fullWidth
                  loading={quoteLoading}
                  disabled={quoteLoading}
                  icon="calculator"
                  onPress={handleGetPorterQuote}
                >
                  Get Porter Quote
                </AppButton>
              ) : (
                <View style={[styles.quoteCard, { backgroundColor: appColors.shell, borderColor: appColors.border }]}>
                  <View style={styles.quoteRow}>
                    <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>Estimated Fare</Text>
                    <Text variant="titleMedium" style={[styles.quoteValue, { color: appColors.brand }]}>{porterQuote.fare_display}</Text>
                  </View>
                  <KeyValueRow label="Delivery Time" value={porterQuote.estimated_time_display} />
                  <KeyValueRow label="Distance" value={`${porterQuote.distance_km} km`} />
                  <AppButton
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={bookingPorter}
                    disabled={bookingPorter}
                    icon="motorbike"
                    onPress={handleBookPorter}
                    style={{ marginTop: spacing.md }}
                  >
                    Book Porter Delivery
                  </AppButton>
                </View>
              )}
            </View>
          )}

          {deliveryType === 'in_house' && (
            <View style={styles.inHouseSection}>
              <AppButton
                variant="primary"
                size="lg"
                fullWidth
                loading={dispatching}
                disabled={dispatching}
                icon="account-arrow-right"
                onPress={handleDispatchInHouse}
              >
                Assign Delivery Staff
              </AppButton>
            </View>
          )}

          <View style={styles.cancelOption}>
            <AppButton
              variant="text"
              size="sm"
              onPress={() => handleStatusUpdate('cancelled')}
            >
              Cancel Order
            </AppButton>
          </View>
        </View>
      )}

      {/* Porter tracking section for out_for_delivery */}
      {isOutForDelivery && isPorterDelivery && porterDelivery && (
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <SectionHeader title="Porter Delivery" style={{ paddingHorizontal: 0 }} />

          <View style={[styles.porterStatusCard, { backgroundColor: appColors.shell, borderColor: appColors.border }]}>
            <View style={styles.porterStatusRow}>
              <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>Status</Text>
              <View style={[styles.porterStatusBadge, { backgroundColor: getPorterStatusColor(porterDelivery.porter_status) }]}>
                <Text style={[styles.porterStatusText, { color: appColors.text.primary }]}>{formatPorterStatus(porterDelivery.porter_status)}</Text>
              </View>
            </View>

            {porterDelivery.driver_name && (
              <Pressable onPress={callDriver} style={[styles.driverCard, { backgroundColor: appColors.surface }]}>
                <MaterialCommunityIcons name="account" size={24} color={appColors.brand} />
                <View style={styles.driverInfo}>
                  <Text variant="bodyMedium" style={[styles.driverName, { color: appColors.text.primary }]}>{porterDelivery.driver_name}</Text>
                  {porterDelivery.driver_phone && (
                    <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{porterDelivery.driver_phone}</Text>
                  )}
                  {porterDelivery.vehicle_number && (
                    <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{porterDelivery.vehicle_number}</Text>
                  )}
                </View>
                <MaterialCommunityIcons name="phone" size={24} color={appColors.positive} />
              </Pressable>
            )}

            {porterDelivery.tracking_url && (
              <AppButton
                variant="secondary"
                size="md"
                fullWidth
                icon="map-marker"
                onPress={openTrackingUrl}
                style={{ marginTop: spacing.md }}
              >
                Track on Porter
              </AppButton>
            )}

            <View style={styles.porterActions}>
              <AppButton
                variant="text"
                size="sm"
                onPress={() => handleCancelPorter(true)}
                loading={cancellingPorter}
              >
                Cancel & Reassign
              </AppButton>
              <AppButton
                variant="danger"
                size="sm"
                onPress={() => handleCancelPorter(false)}
                loading={cancellingPorter}
              >
                Cancel Delivery
              </AppButton>
            </View>
          </View>
        </View>
      )}

      {/* Standard actions for out_for_delivery (in-house) */}
      {isOutForDelivery && !isPorterDelivery && availableActions.length > 0 && (
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <SectionHeader title={t('admin.updateStatus')} style={{ paddingHorizontal: 0 }} />
          <View style={styles.actionsRow}>
            {availableActions.map((status) => {
              const isDanger = status === 'cancelled' || status === 'delivery_failed';
              return (
                <View key={status} style={styles.actionButtonWrapper}>
                  <AppButton
                    variant={isDanger ? 'danger' : 'primary'}
                    size="md"
                    fullWidth
                    onPress={() => handleStatusUpdate(status)}
                  >
                    {t(`status.${status}`)}
                  </AppButton>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <SectionHeader title={t('checkout.deliveryAddress')} style={{ paddingHorizontal: 0 }} />
        <Text variant="bodyMedium" style={{ color: appColors.text.primary, lineHeight: 20 }}>
          {order.shipping_address_line1 || order.delivery_address}
        </Text>
        {order.shipping_address_line2 && (
          <Text variant="bodyMedium" style={{ color: appColors.text.primary, lineHeight: 20 }}>{order.shipping_address_line2}</Text>
        )}
        <Text variant="bodySmall" style={{ color: appColors.text.secondary, marginTop: spacing.xs }}>
          {order.shipping_city && `${order.shipping_city}, `}
          {t('common.pincode')}: {order.shipping_pincode || order.delivery_pincode}
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: appColors.text.secondary, marginBottom: 0 }]}>{t('admin.orderItems')}</Text>
          {canEditItems && !editing && (
            <Pressable onPress={handleEnterEditMode} style={[styles.editPencilBtn, { backgroundColor: appColors.brandLight }]} hitSlop={8}>
              <MaterialCommunityIcons name="pencil" size={18} color={appColors.brand} />
            </Pressable>
          )}
        </View>

        {!editing ? (
          <>
            {(order.items ?? []).map((item) => (
              <View key={item.id} style={[styles.orderItem, { borderBottomColor: appColors.border }]}>
                <View style={styles.itemInfo}>
                  <Text variant="bodyMedium" style={{ fontFamily: fontFamily.regular, color: appColors.text.primary }}>{item.product_name}</Text>
                  <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{item.weight_grams}g</Text>
                </View>
                <Text variant="bodyMedium" style={{ color: appColors.text.secondary, marginHorizontal: spacing.lg }}>x{item.quantity}</Text>
                <Text variant="bodyMedium" style={{ fontFamily: fontFamily.semiBold, color: appColors.text.primary }}>{formatPrice(item.total_paise || item.unit_price_paise * item.quantity)}</Text>
              </View>
            ))}
            <View style={[styles.totalDivider, { backgroundColor: appColors.border }]} />
            <View style={styles.totalRow}>
              <Text variant="titleSmall">{t('cart.total')}</Text>
              <Text variant="titleMedium" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>{formatPrice(order.total_paise)}</Text>
            </View>
          </>
        ) : (
          <>
            {editedItems.map((item, idx) => (
              <View key={`${item.product_id}-${idx}`} style={[styles.orderItem, { borderBottomColor: appColors.border }]}>
                <View style={styles.itemInfo}>
                  <Text variant="bodyMedium" style={{ fontFamily: fontFamily.regular, color: appColors.text.primary }}>{item.product_name}</Text>
                  <Text variant="bodySmall" style={{ color: appColors.text.secondary }}>{item.weight_grams}g</Text>
                </View>
                <Text variant="bodyMedium" style={{ color: appColors.text.secondary, marginHorizontal: spacing.lg }}>x{item.quantity}</Text>
                <Text variant="bodyMedium" style={{ fontFamily: fontFamily.semiBold, color: appColors.text.primary }}>{formatPrice(item.unit_price_paise * item.quantity)}</Text>
                <Pressable onPress={() => handleEditItem(item)} hitSlop={8} style={styles.editIcon}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={appColors.brand} />
                </Pressable>
                <Pressable onPress={() => handleRemoveEditedItem(item.product_id)} hitSlop={8} style={styles.deleteIcon}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={appColors.negative} />
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.addItemRow} onPress={() => setAddingItem(true)}>
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color={appColors.brand} />
              <Text variant="bodyMedium" style={{ color: appColors.brand, fontFamily: fontFamily.semiBold }}>{t('admin.addItem')}</Text>
            </Pressable>

            <View style={[styles.totalDivider, { backgroundColor: appColors.border }]} />
            <View style={styles.totalRow}>
              <Text variant="titleSmall">{t('cart.total')}</Text>
              <Text variant="titleMedium" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>{formatPrice(editedTotal)}</Text>
            </View>

            <View style={styles.editActionsRow}>
              <View style={styles.editActionBtn}>
                <AppButton variant="secondary" size="md" fullWidth onPress={handleCancelEdit}>
                  {t('common.cancel')}
                </AppButton>
              </View>
              <View style={styles.editActionBtn}>
                <AppButton
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={savingItems}
                  disabled={savingItems}
                  onPress={handleSaveItems}
                >
                  {t('admin.saveChanges')}
                </AppButton>
              </View>
            </View>
          </>
        )}
      </View>

      {order.notes && (
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <SectionHeader title={t('checkout.orderNotes')} style={{ paddingHorizontal: 0 }} />
          <Text variant="bodyMedium" style={{ color: appColors.text.secondary, fontStyle: 'italic' }}>{order.notes}</Text>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: appColors.surface }]}>
        <SectionHeader title={t('admin.adminNotes')} style={{ paddingHorizontal: 0 }} />
        <TextInput
          style={[styles.adminNotesInput, { borderColor: appColors.border, color: appColors.text.primary }]}
          value={adminNotes}
          onChangeText={(text) => setAdminNotes(text.slice(0, 300))}
          placeholder={t('admin.adminNotesPlaceholder')}
          placeholderTextColor={appColors.text.secondary}
          multiline
          maxLength={300}
        />
        <Text variant="bodySmall" style={{ color: appColors.text.secondary, textAlign: 'right', marginTop: spacing.xs }}>{adminNotes.length}/300</Text>
        {adminNotes !== savedNotes && (
          <View style={{ marginTop: spacing.sm }}>
            <AppButton
              variant="primary"
              size="md"
              fullWidth
              loading={savingNotes}
              disabled={savingNotes}
              onPress={handleSaveNotes}
            >
              {t('common.save')}
            </AppButton>
          </View>
        )}
      </View>

      <DeliveryStaffPicker
        visible={staffPickerVisible}
        onClose={() => setStaffPickerVisible(false)}
        onSelect={handleStaffSelected}
        loading={dispatching}
      />

      <EditOrderItemSheet
        item={editingItem}
        onDismiss={() => setEditingItem(null)}
        onUpdate={handleUpdateEditedItem}
      />

      <AddOrderItemSheet
        visible={addingItem}
        onDismiss={() => setAddingItem(false)}
        onAdd={handleAddOrderItem}
      />

      <FioriDialog
        visible={dialog !== null}
        onDismiss={() => setDialog(null)}
        title={dialog?.title ?? ''}
        actions={[
          { label: t('common.cancel'), onPress: () => setDialog(null), variant: 'text' },
          { label: dialog?.confirmLabel ?? t('common.confirm'), onPress: () => dialog?.onConfirm(), variant: dialog?.variant ?? 'primary' },
        ]}
      >
        <Text variant="bodyMedium">{dialog?.message}</Text>
      </FioriDialog>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatPorterStatus(status?: string): string {
  switch (status) {
    case 'live':
    case 'pending':
      return 'Searching...';
    case 'allocated':
      return 'Driver Assigned';
    case 'reached_for_pickup':
      return 'At Pickup';
    case 'picked_up':
      return 'Picked Up';
    case 'reached_for_drop':
      return 'Arriving';
    case 'ended':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || 'Unknown';
  }
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { padding: spacing.lg, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerStripe: { width: 4, height: 24, borderRadius: 2, marginRight: spacing.sm },
  orderId: { fontFamily: fontFamily.bold },
  deliveryTypeBadge: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.xs },
  customerCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, gap: spacing.md },
  customerInfo: { flex: 1 },
  sectionTitle: { fontSize: 13, fontFamily: fontFamily.semiBold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.md },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  editPencilBtn: { padding: spacing.sm, borderRadius: borderRadius.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.md },
  actionButtonWrapper: { flex: 1 },
  segmentedButtons: { marginBottom: spacing.lg },
  porterSection: { marginTop: spacing.sm },
  quoteCard: { padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1 },
  quoteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  quoteValue: { fontFamily: fontFamily.bold },
  inHouseSection: { marginTop: spacing.sm },
  cancelOption: { marginTop: spacing.md, alignItems: 'center' },
  porterStatusCard: { padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1 },
  porterStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  porterStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  porterStatusText: { fontSize: 12, fontFamily: fontFamily.semiBold },
  driverCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, gap: spacing.md },
  driverInfo: { flex: 1 },
  driverName: { fontFamily: fontFamily.semiBold },
  porterActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  totalDivider: { height: 1, marginTop: spacing.sm, marginBottom: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adminNotesInput: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, fontFamily: fontFamily.regular, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  editIcon: { marginLeft: spacing.sm },
  deleteIcon: { marginLeft: spacing.sm },
  addItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.sm },
  editActionsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  editActionBtn: { flex: 1 },
});
