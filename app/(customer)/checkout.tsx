import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Text,
  TextInput,
  Card,
  Chip,
  RadioButton,
  Divider,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { selectCartItems, selectCartTotal, clearCart } from '../../src/store/slices/cartSlice';
import { selectSelectedAddressId, setSelectedAddress } from '../../src/store/slices/addressesSlice';
import { useGetAddressesQuery, useGetAppSettingsQuery, useCreateOrderMutation } from '../../src/store/apiSlice';
import { formatPrice, getPerKgPaise, calculateShipping, isPincodeServiceable, DEFAULT_APP_SETTINGS } from '../../src/constants';
import { colors, spacing, borderRadius, elevation, fontFamily, gradients } from '../../src/constants/theme';
import { Address } from '../../src/types';
import { AppButton } from '../../src/components/common/AppButton';
import { useToast } from '../../src/components/common/Toast';
import { EmptyState } from '../../src/components/common/EmptyState';
import { hapticSuccess, hapticError } from '../../src/utils/haptics';

const SCROLL_OFFSET = 100;
const BG_BLACK = '#000000';
const STEP_SIZE = 40;

export default function CheckoutScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const isGujarati = i18n.language === 'gu';

  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartTotal);
  const selectedAddressId = useAppSelector(selectSelectedAddressId);

  const { data: addresses = [], isLoading: addressesLoading } = useGetAddressesQuery();
  const { data: appSettings = DEFAULT_APP_SETTINGS } = useGetAppSettingsQuery();
  const [createOrder, { isLoading: ordersLoading }] = useCreateOrderMutation();

  const [notes, setNotes] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const sectionYPositions = useRef<number[]>([0, 0, 0]);

  const STEPS = [
    { label: t('checkout.step_address'), icon: 'map-marker-outline' as const },
    { label: t('checkout.step_review'), icon: 'clipboard-text-outline' as const },
    { label: t('checkout.step_confirm'), icon: 'check-circle-outline' as const },
  ];

  // Step indicator animations (explicit calls to avoid hooks-in-loop)
  const s0 = useSharedValue(1);
  const s1 = useSharedValue(1);
  const s2 = useSharedValue(1);
  const stepScales = [s0, s1, s2];
  const sa0 = useAnimatedStyle(() => ({ transform: [{ scale: s0.value }] }));
  const sa1 = useAnimatedStyle(() => ({ transform: [{ scale: s1.value }] }));
  const sa2 = useAnimatedStyle(() => ({ transform: [{ scale: s2.value }] }));
  const stepAnimStyles = [sa0, sa1, sa2];

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y + SCROLL_OFFSET;
    const positions = sectionYPositions.current;
    let newStep = 0;
    if (y >= positions[2] && positions[2] > 0) newStep = 2;
    else if (y >= positions[1] && positions[1] > 0) newStep = 1;

    if (newStep !== currentStep) {
      setCurrentStep(newStep);
      stepScales[newStep].value = withSpring(1.2, { damping: 8, stiffness: 400 });
      setTimeout(() => {
        stepScales[newStep].value = withSpring(1, { damping: 10, stiffness: 300 });
      }, 200);
    }
  }, [currentStep, stepScales]);

  const handleSectionLayout = (index: number) => (e: LayoutChangeEvent) => {
    sectionYPositions.current[index] = e.nativeEvent.layout.y;
  };

  const StepIndicator = () => (
    <View style={styles.stepContainer}>
      {STEPS.map((step, index) => {
        const isActive = index <= currentStep;
        const isCurrent = index === currentStep;
        const isCompleted = index < currentStep;
        const circleColor = isCurrent ? colors.brand : isCompleted ? colors.positive : colors.neutralLight;
        const iconColor = isActive ? colors.text.inverse : colors.neutral;
        return (
          <View key={index} style={styles.stepWrapper}>
            {index > 0 && (
              <View style={[styles.stepLine, { backgroundColor: isActive ? colors.positive : colors.neutralLight }]} />
            )}
            <Animated.View style={[styles.stepCircle, { backgroundColor: circleColor }, stepAnimStyles[index]]}>
              {isCompleted ? (
                <MaterialCommunityIcons name="check" size={20} color={iconColor} />
              ) : (
                <MaterialCommunityIcons name={step.icon} size={20} color={iconColor} />
              )}
            </Animated.View>
            <Text
              variant="labelSmall"
              style={[styles.stepLabel, isActive && styles.stepLabelActive]}
              accessibilityRole="header"
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const shippingCharge = calculateShipping(subtotal, appSettings);
  const total = subtotal + shippingCharge;
  const minOrderMet = subtotal >= appSettings.min_order_paise;

  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const defaultAddr = addresses.find((a: Address) => a.is_default);
      dispatch(setSelectedAddress(defaultAddr?.id || addresses[0].id));
    }
  }, [addresses, selectedAddressId, dispatch]);

  const handleSelectAddress = (address: Address) => { dispatch(setSelectedAddress(address.id)); };
  const handleAddAddress = () => { router.push('/(customer)/addresses/new'); };
  const handleEditAddress = (id: string) => { router.push(`/(customer)/addresses/${id}`); };

  const handlePlaceOrder = async () => {
    console.log('[checkout] handlePlaceOrder called');
    console.log('[checkout] selectedAddressId:', selectedAddressId);
    console.log('[checkout] selectedAddress:', selectedAddress ? `${selectedAddress.label || selectedAddress.full_name} (${selectedAddress.pincode})` : 'NONE');
    console.log('[checkout] subtotal:', subtotal, 'minOrderPaise:', appSettings.min_order_paise, 'minOrderMet:', minOrderMet);
    console.log('[checkout] items count:', items.length);

    if (!selectedAddressId || !selectedAddress) {
      console.log('[checkout] BLOCKED: no address selected');
      hapticError();
      showToast({ message: t('checkout.selectAddress'), type: 'error' });
      return;
    }
    if (!minOrderMet) {
      console.log('[checkout] BLOCKED: min order not met');
      hapticError();
      showToast({ message: t('checkout.minOrderNotMet', { amount: formatPrice(appSettings.min_order_paise) }), type: 'error' });
      return;
    }
    if (!isPincodeServiceable(selectedAddress.pincode, appSettings)) {
      console.log('[checkout] BLOCKED: pincode not serviceable:', selectedAddress.pincode, 'allowed:', appSettings.serviceable_pincodes);
      hapticError();
      showToast({ message: t('checkout.pincodeNotServiceable'), type: 'error' });
      return;
    }

    const orderItems = items.map((item) => ({
      product_id: item.product_id,
      weight_grams: item.weight_grams,
      quantity: item.quantity,
    }));

    const payload = { items: orderItems, address_id: selectedAddressId, notes: notes || undefined };
    console.log('[checkout] sending payload:', JSON.stringify(payload));

    try {
      const result = await createOrder(payload).unwrap();
      console.log('[checkout] SUCCESS — order created:', JSON.stringify(result));
      dispatch(clearCart());
      hapticSuccess();
      showToast({ message: t('checkout.orderPlaced'), type: 'success' });
      router.replace('/(customer)/orders');
    } catch (error) {
      console.log('[checkout] FAILED — raw error:', JSON.stringify(error));
      hapticError();
      const status = typeof error === 'object' && error !== null && 'status' in error ? (error as { status: unknown }).status : 'unknown';
      const errorData = typeof error === 'object' && error !== null && 'data' in error ? (error as { data: unknown }).data : null;
      console.log('[checkout] error status:', status, 'error data:', errorData);

      let message = '';
      const errorCode = typeof errorData === 'string' ? errorData : '';
      if (errorCode === 'CHECKOUT_001') message = t('checkout.missingAddress');
      else if (errorCode === 'CHECKOUT_002') message = t('checkout.pincodeNotServiceable');
      else if (errorCode === 'CHECKOUT_003') message = t('checkout.minOrderNotMet', { amount: formatPrice(appSettings.min_order_paise) });
      else if (errorCode) message = errorCode;

      showToast({ message: message || t('common.error'), type: 'error' });
    }
  };

  if (addressesLoading && addresses.length === 0) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <StepIndicator />

        {/* ── Address Section ────────────────────────────────────── */}
        <View style={styles.card} onLayout={handleSectionLayout(0)}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle} accessibilityRole="header">
              {t('checkout.deliveryAddress')}
            </Text>
            <AppButton variant="text" size="sm" onPress={handleAddAddress}>{t('checkout.addNew')}</AppButton>
          </View>
          {addresses.length === 0 ? (
            <EmptyState
              icon="map-marker-off"
              title={t('addresses.empty')}
              subtitle={t('checkout.noSavedAddresses')}
              actionLabel={t('checkout.addAddress')}
              onAction={handleAddAddress}
            />
          ) : (
            <RadioButton.Group
              value={selectedAddressId || ''}
              onValueChange={(value) => { const addr = addresses.find((a) => a.id === value); if (addr) handleSelectAddress(addr); }}
            >
              {addresses.map((address) => (
                <Card
                  key={address.id}
                  mode="outlined"
                  style={[styles.addressCard, selectedAddressId === address.id && styles.addressCardSelected]}
                  onPress={() => handleSelectAddress(address)}
                >
                  <Card.Content style={styles.addressCardContent}>
                    <RadioButton value={address.id} />
                    <View style={styles.addressContent}>
                      <View style={styles.addressHeader}>
                        <View style={styles.addressLabelRow}>
                          <Text variant="titleSmall">{address.label || address.full_name}</Text>
                          {address.is_default && (
                            <Chip compact style={styles.defaultChip} textStyle={styles.defaultChipText}>
                              {t('addresses.default')}
                            </Chip>
                          )}
                        </View>
                        <IconButton
                          icon="pencil-outline"
                          size={18}
                          iconColor={colors.brand}
                          style={styles.editBtn}
                          onPress={() => handleEditAddress(address.id)}
                          accessibilityLabel={t('common.edit')}
                        />
                      </View>
                      <Text variant="bodySmall" style={styles.addressName}>{address.full_name}</Text>
                      <Text variant="bodySmall" style={styles.addressLine}>
                        {address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}
                      </Text>
                      <Text variant="bodySmall" style={styles.addressLine}>
                        {address.city}{address.state ? `, ${address.state}` : ''} - {address.pincode}
                      </Text>
                      <Text variant="bodySmall" style={styles.addressPhone}>{address.phone}</Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </RadioButton.Group>
          )}
        </View>

        {/* ── Notes Section ──────────────────────────────────────── */}
        <View style={styles.card} onLayout={handleSectionLayout(1)}>
          <Text variant="titleMedium" style={styles.sectionTitle} accessibilityRole="header">
            {t('checkout.orderNotes')}
          </Text>
          <TextInput
            mode="outlined"
            placeholder={t('checkout.orderNotesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
            contentStyle={styles.notesContent}
            outlineColor={colors.fieldBorder}
            activeOutlineColor={colors.brand}
            outlineStyle={styles.notesOutline}
          />
        </View>

        {/* ── Summary Section ────────────────────────────────────── */}
        <View style={styles.summaryCard} onLayout={handleSectionLayout(2)}>
          <View style={styles.summaryBody}>
            <Text variant="titleMedium" style={styles.sectionTitle} accessibilityRole="header">
              {t('checkout.orderSummary')} ({items.length})
            </Text>

            {/* ── Line Items ─────────────────────────────────────── */}
            {items.map((item, idx) => {
              const itemPrice = Math.round(getPerKgPaise(item.product) * item.weight_grams / 1000);
              const weightLabel = item.weight_grams >= 1000 ? `${(item.weight_grams / 1000)}kg` : `${item.weight_grams}g`;
              const isLast = idx === items.length - 1;
              const hasImage = !!item.product?.image_url;
              const displayName = isGujarati && item.product.name_gu ? item.product.name_gu : item.product.name;
              return (
                <View key={`${item.product_id}-${item.weight_grams}`} style={[styles.orderItem, isLast && styles.orderItemLast]}>
                  <View style={styles.itemThumb}>
                    {hasImage ? (
                      <Image source={{ uri: item.product.image_url }} style={styles.thumbImage} contentFit="cover" />
                    ) : (
                      <LinearGradient
                        colors={gradients.brand as unknown as [string, string]}
                        style={styles.thumbImage}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <MaterialCommunityIcons name="leaf" size={14} color="rgba(255,255,255,0.8)" />
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text variant="bodyMedium" style={styles.itemName} numberOfLines={1}>{displayName}</Text>
                    <Text variant="bodySmall" style={styles.itemWeight}>{weightLabel}</Text>
                  </View>
                  <View style={styles.itemQtyBadge}>
                    <Text variant="labelSmall" style={styles.itemQtyText}>x{item.quantity}</Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.itemPrice}>{formatPrice(itemPrice * item.quantity)}</Text>
                </View>
              );
            })}

            {/* ── Breakdown ──────────────────────────────────────── */}
            <Divider style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium" style={styles.summaryLabel}>{t('checkout.subtotal')}</Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium" style={styles.summaryLabel}>{t('checkout.shipping')}</Text>
              {shippingCharge === 0 ? (
                <View style={styles.freeShippingBadge}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={colors.positive} />
                  <Text variant="bodyMedium" style={styles.freeShippingText}>{t('checkout.free')}</Text>
                </View>
              ) : (
                <Text variant="bodyMedium" style={styles.summaryValue}>{formatPrice(shippingCharge)}</Text>
              )}
            </View>

            {/* ── Min Order Warning ──────────────────────────────── */}
            {!minOrderMet && (
              <View style={styles.minOrderRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.negative} />
                <Text variant="bodySmall" style={styles.minOrderWarning}>
                  {t('checkout.minOrderWarning', { amount: formatPrice(appSettings.min_order_paise) })}
                </Text>
              </View>
            )}
          </View>

          {/* ── Total (full-bleed highlight) ──────────────────── */}
          <View style={styles.totalHighlight}>
            <Text variant="titleMedium" style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text variant="headlineSmall" style={styles.totalPrice}>{formatPrice(total)}</Text>
          </View>
        </View>

        {/* ── Place Order ────────────────────────────────────────── */}
        <View style={styles.placeOrderCard}>
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            loading={ordersLoading}
            disabled={ordersLoading || !selectedAddressId || !minOrderMet}
            onPress={handlePlaceOrder}
          >
            {t('checkout.placeOrder')}
          </AppButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Layout
  root: { flex: 1, backgroundColor: BG_BLACK },
  container: { flex: 1, backgroundColor: BG_BLACK },
  scrollContent: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG_BLACK },

  // Step Indicator
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...elevation.level2,
  },
  stepWrapper: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: {
    width: STEP_SIZE,
    height: STEP_SIZE,
    borderRadius: STEP_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: STEP_SIZE / 2,
    right: '50%',
    left: undefined,
    width: '100%',
    height: 3,
    zIndex: -1,
  },
  stepLabel: { marginTop: spacing.sm, color: colors.neutral, textAlign: 'center' },
  stepLabelActive: { color: colors.brand, fontFamily: fontFamily.semiBold },

  // Section Cards
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...elevation.level2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Address Cards
  addressCard: { marginBottom: spacing.sm, borderRadius: borderRadius.lg },
  addressCardSelected: {
    borderColor: colors.brand,
    borderWidth: 2,
    backgroundColor: colors.brandTint,
    borderRadius: borderRadius.lg,
  },
  addressCardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  addressContent: { flex: 1, marginLeft: spacing.xs },
  addressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  addressLabelRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  editBtn: { margin: 0 },
  defaultChip: { marginLeft: spacing.sm, backgroundColor: colors.positiveLight },
  defaultChipText: { fontSize: 10, color: colors.positive },
  addressName: { color: colors.text.primary, marginBottom: spacing.xs },
  addressLine: { color: colors.text.secondary, lineHeight: 20 },
  addressPhone: { color: colors.text.secondary, marginTop: spacing.xs },

  // Notes
  notesInput: { backgroundColor: colors.surface, minHeight: 88 },
  notesContent: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  notesOutline: { borderRadius: borderRadius.md },

  // Summary Card (split: body + total footer)
  summaryCard: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...elevation.level2,
  },
  summaryBody: { padding: spacing.lg },

  // Order Items
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderItemLast: { borderBottomWidth: 0 },
  itemThumb: { marginRight: spacing.sm },
  thumbImage: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { color: colors.text.primary },
  itemWeight: { color: colors.text.secondary, marginTop: 2 },
  itemQtyBadge: {
    backgroundColor: colors.informativeLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.sm,
    minWidth: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  itemQtyText: { color: colors.informative, fontFamily: fontFamily.semiBold },
  itemPrice: { fontFamily: fontFamily.semiBold, color: colors.text.primary, minWidth: 64, textAlign: 'right' },

  // Breakdown
  divider: { marginVertical: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: { color: colors.text.secondary },
  summaryValue: { color: colors.text.primary },
  freeShippingBadge: { flexDirection: 'row', alignItems: 'center' },
  freeShippingText: { color: colors.positive, fontFamily: fontFamily.bold, marginLeft: spacing.xs },

  // Total (full-bleed footer)
  totalHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.brandTint,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { fontFamily: fontFamily.semiBold, color: colors.text.primary },
  totalPrice: { color: colors.brand, fontFamily: fontFamily.bold },

  // Validation
  minOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.negativeLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  minOrderWarning: { color: colors.negative, marginLeft: spacing.sm },

  // Place Order
  placeOrderCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...elevation.level2,
  },
});
