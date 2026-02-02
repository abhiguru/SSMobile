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
import { formatPrice, getPerKgPaise, calculateShipping, isPincodeServiceable, DEFAULT_APP_SETTINGS, resolveImageSource } from '../../src/constants';
import { getStoredTokens } from '../../src/services/supabase';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme';
import { Address } from '../../src/types';
import { AppButton } from '../../src/components/common/AppButton';
import { FioriChip } from '../../src/components/common/FioriChip';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { KeyValueRow } from '../../src/components/common/KeyValueRow';
import { useToast } from '../../src/components/common/Toast';
import { Toolbar } from '../../src/components/common/Toolbar';
import { EmptyState } from '../../src/components/common/EmptyState';
import { hapticSuccess, hapticError } from '../../src/utils/haptics';

const SCROLL_OFFSET = 100;
const STEP_SIZE = 40;

export default function CheckoutScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { appColors, appGradients } = useAppTheme();
  const isGujarati = i18n.language === 'gu';

  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartTotal);
  const selectedAddressId = useAppSelector(selectSelectedAddressId);
  const user = useAppSelector((state) => state.auth.user);

  const { data: addresses = [], isLoading: addressesLoading } = useGetAddressesQuery();
  const { data: appSettings = DEFAULT_APP_SETTINGS } = useGetAppSettingsQuery();
  const [createOrder, { isLoading: ordersLoading }] = useCreateOrderMutation();

  const [notes, setNotes] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => { getStoredTokens().then(({ accessToken: t }) => setAccessToken(t)); }, []);
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
    <View style={[styles.stepContainer, { backgroundColor: appColors.surface }, elevation.level2]}>
      {STEPS.map((step, index) => {
        const isActive = index <= currentStep;
        const isCurrent = index === currentStep;
        const isCompleted = index < currentStep;
        const circleColor = isCurrent ? appColors.brand : isCompleted ? appColors.positive : appColors.neutralLight;
        const iconColor = isActive ? appColors.text.inverse : appColors.neutral;
        return (
          <View key={index} style={styles.stepWrapper}>
            {index > 0 && (
              <View style={[styles.stepLine, { backgroundColor: isActive ? appColors.positive : appColors.neutralLight }]} />
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
              style={[styles.stepLabel, { color: appColors.neutral }, isActive && { color: appColors.brand, fontFamily: fontFamily.semiBold }]}
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
  const handleAddAddress = () => {
    if (!user?.name?.trim()) {
      showToast({ message: t('addresses.errors.nameRequired'), type: 'error' });
      router.push('/(customer)/profile');
      return;
    }
    router.push('/(customer)/addresses/new');
  };
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
    return <View style={[styles.centered, { backgroundColor: appColors.shell }]}><ActivityIndicator size="large" color={appColors.brand} /></View>;
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: appColors.shell }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.container, { backgroundColor: appColors.shell }]}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <StepIndicator />

        {/* ── Address Section ────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: appColors.surface }, elevation.level2]} onLayout={handleSectionLayout(0)}>
          <SectionHeader title={t('checkout.deliveryAddress')} actionLabel={t('checkout.addNew')} onAction={handleAddAddress} style={{ paddingHorizontal: 0 }} />
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
                  style={[styles.addressCard, selectedAddressId === address.id && { borderColor: appColors.brand, borderWidth: 2, backgroundColor: appColors.brandTint, borderRadius: borderRadius.lg }]}
                  onPress={() => handleSelectAddress(address)}
                >
                  <Card.Content style={styles.addressCardContent}>
                    <RadioButton value={address.id} />
                    <View style={styles.addressContent}>
                      <View style={styles.addressHeader}>
                        <View style={styles.addressLabelRow}>
                          <Text variant="titleSmall">{address.label || address.full_name}</Text>
                          {address.is_default && (
                            <FioriChip label={t('addresses.default')} selected variant="positive" />
                          )}
                        </View>
                        <IconButton
                          icon="pencil-outline"
                          size={18}
                          iconColor={appColors.brand}
                          style={styles.editBtn}
                          onPress={() => handleEditAddress(address.id)}
                          accessibilityLabel={t('common.edit')}
                        />
                      </View>
                      <Text variant="bodySmall" style={[styles.addressName, { color: appColors.text.primary }]}>{address.full_name}</Text>
                      <Text variant="bodySmall" style={[styles.addressLine, { color: appColors.text.secondary }]}>
                        {address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}
                      </Text>
                      <Text variant="bodySmall" style={[styles.addressLine, { color: appColors.text.secondary }]}>
                        {address.city}{address.state ? `, ${address.state}` : ''} - {address.pincode}
                      </Text>
                      <Text variant="bodySmall" style={[styles.addressPhone, { color: appColors.text.secondary }]}>{address.phone}</Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </RadioButton.Group>
          )}
        </View>

        {/* ── Notes Section ──────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: appColors.surface }, elevation.level2]} onLayout={handleSectionLayout(1)}>
          <SectionHeader title={t('checkout.orderNotes')} style={{ paddingHorizontal: 0 }} />
          <TextInput
            mode="outlined"
            placeholder={t('checkout.orderNotesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={[styles.notesInput, { backgroundColor: appColors.surface }]}
            contentStyle={styles.notesContent}
            outlineColor={appColors.fieldBorder}
            activeOutlineColor={appColors.brand}
            outlineStyle={styles.notesOutline}
          />
        </View>

        {/* ── Summary Section ────────────────────────────────────── */}
        <View style={[styles.summaryCard, { backgroundColor: appColors.surface }, elevation.level2]} onLayout={handleSectionLayout(2)}>
          <View style={styles.summaryBody}>
            <SectionHeader title={`${t('checkout.orderSummary')} (${items.length})`} style={{ paddingHorizontal: 0 }} />

            {/* ── Line Items ─────────────────────────────────────── */}
            {items.map((item, idx) => {
              const itemPrice = Math.round(getPerKgPaise(item.product) * item.weight_grams / 1000);
              const weightLabel = item.weight_grams >= 1000 ? `${(item.weight_grams / 1000)}kg` : `${item.weight_grams}g`;
              const isLast = idx === items.length - 1;
              const imgSource = resolveImageSource(item.product?.image_url, accessToken);
              const displayName = isGujarati && item.product.name_gu ? item.product.name_gu : item.product.name;
              return (
                <View key={`${item.product_id}-${item.weight_grams}`} style={[styles.orderItem, { borderBottomColor: appColors.border }, isLast && styles.orderItemLast]}>
                  <View style={styles.itemThumb}>
                    {imgSource ? (
                      <Image source={imgSource} style={styles.thumbImage} contentFit="cover" />
                    ) : (
                      <LinearGradient
                        colors={appGradients.brand as unknown as [string, string]}
                        style={styles.thumbImage}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <MaterialCommunityIcons name="leaf" size={14} color="rgba(255,255,255,0.8)" />
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text variant="bodyMedium" style={[styles.itemName, { color: appColors.text.primary }]} numberOfLines={1}>{displayName}</Text>
                    <Text variant="bodySmall" style={[styles.itemWeight, { color: appColors.text.secondary }]}>{weightLabel}</Text>
                  </View>
                  <View style={[styles.itemQtyBadge, { backgroundColor: appColors.informativeLight }]}>
                    <Text variant="labelSmall" style={[styles.itemQtyText, { color: appColors.informative }]}>x{item.quantity}</Text>
                  </View>
                  <Text variant="bodyMedium" style={[styles.itemPrice, { color: appColors.text.primary }]}>{formatPrice(itemPrice * item.quantity)}</Text>
                </View>
              );
            })}

            {/* ── Breakdown ──────────────────────────────────────── */}
            <Divider style={styles.divider} />
            <KeyValueRow label={t('checkout.subtotal')} value={formatPrice(subtotal)} />
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>{t('checkout.shipping')}</Text>
              {shippingCharge === 0 ? (
                <View style={styles.freeShippingBadge}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={appColors.positive} />
                  <Text variant="bodyMedium" style={{ color: appColors.positive, fontFamily: fontFamily.bold, marginLeft: spacing.xs }}>{t('checkout.free')}</Text>
                </View>
              ) : (
                <Text variant="bodyMedium" style={{ color: appColors.text.primary }}>{formatPrice(shippingCharge)}</Text>
              )}
            </View>

            {/* ── Min Order Warning ──────────────────────────────── */}
            {!minOrderMet && (
              <View style={[styles.minOrderRow, { backgroundColor: appColors.negativeLight }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.negative} />
                <Text variant="bodySmall" style={{ color: appColors.negative, marginLeft: spacing.sm }}>
                  {t('checkout.minOrderWarning', { amount: formatPrice(appSettings.min_order_paise) })}
                </Text>
              </View>
            )}
          </View>

          {/* ── Total (full-bleed highlight) ──────────────────── */}
          <View style={[styles.totalHighlight, { backgroundColor: appColors.brandTint, borderTopColor: appColors.border }]}>
            <Text variant="titleMedium" style={{ fontFamily: fontFamily.semiBold, color: appColors.text.primary }}>{t('cart.total')}</Text>
            <Text variant="headlineSmall" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>{formatPrice(total)}</Text>
          </View>
        </View>

      </ScrollView>
      <Toolbar>
        <View style={styles.toolbarInner}>
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
      </Toolbar>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Layout
  root: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingTop: spacing.lg, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Step Indicator
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
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
  stepLabel: { marginTop: spacing.sm, textAlign: 'center' },

  // Section Cards
  card: {
    padding: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  // Address Cards
  addressCard: { marginBottom: spacing.sm, borderRadius: borderRadius.lg },
  addressCardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  addressContent: { flex: 1, marginLeft: spacing.xs },
  addressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  addressLabelRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  editBtn: { margin: 0 },
  addressName: { marginBottom: spacing.xs },
  addressLine: { lineHeight: 20 },
  addressPhone: { marginTop: spacing.xs },

  // Notes
  notesInput: { minHeight: 88 },
  notesContent: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  notesOutline: { borderRadius: borderRadius.md },

  // Summary Card (split: body + total footer)
  summaryCard: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  summaryBody: { padding: spacing.lg },

  // Order Items
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
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
  itemName: {},
  itemWeight: { marginTop: 2 },
  itemQtyBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.sm,
    minWidth: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  itemQtyText: { fontFamily: fontFamily.semiBold },
  itemPrice: { fontFamily: fontFamily.semiBold, minWidth: 64, textAlign: 'right' },

  // Breakdown
  divider: { marginVertical: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  freeShippingBadge: { flexDirection: 'row', alignItems: 'center' },

  // Total (full-bleed footer)
  totalHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },

  // Validation
  minOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },

  // Toolbar
  toolbarInner: { flex: 1 },
});
