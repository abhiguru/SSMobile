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
import {
  Text,
  TextInput,
  Card,
  Chip,
  RadioButton,
  Divider,
  ActivityIndicator,
  useTheme,
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
import { colors, spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { Address } from '../../src/types';
import { AppButton } from '../../src/components/common/AppButton';
import { useToast } from '../../src/components/common/Toast';
import { hapticSuccess, hapticError } from '../../src/utils/haptics';
import type { AppTheme } from '../../src/theme';

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();
  const { showToast } = useToast();

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
    const y = e.nativeEvent.contentOffset.y + 100;
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
        const circleColor = isCurrent ? colors.brand : isCompleted ? colors.positive : colors.border;
        const iconColor = isActive ? colors.text.inverse : colors.neutral;
        return (
          <View key={index} style={styles.stepWrapper}>
            {index > 0 && (
              <View style={[styles.stepLine, { backgroundColor: isActive ? colors.positive : colors.border }]} />
            )}
            <Animated.View style={[styles.stepCircle, { backgroundColor: circleColor }, stepAnimStyles[index]]}>
              {isCompleted ? (
                <MaterialCommunityIcons name="check" size={18} color={iconColor} />
              ) : (
                <MaterialCommunityIcons name={step.icon} size={18} color={iconColor} />
              )}
            </Animated.View>
            <Text variant="labelSmall" style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.label}</Text>
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

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || !selectedAddress) {
      hapticError();
      showToast({ message: t('checkout.selectAddress'), type: 'error' });
      return;
    }
    if (!minOrderMet) {
      hapticError();
      showToast({ message: t('checkout.minOrderNotMet', { amount: formatPrice(appSettings.min_order_paise) }), type: 'error' });
      return;
    }
    if (!isPincodeServiceable(selectedAddress.pincode, appSettings)) {
      hapticError();
      showToast({ message: t('checkout.pincodeNotServiceable'), type: 'error' });
      return;
    }

    const orderItems = items.map((item) => ({
      product_id: item.product_id,
      weight_grams: item.weight_grams,
      quantity: item.quantity,
    }));

    try {
      await createOrder({ items: orderItems, address_id: selectedAddressId, notes: notes || undefined }).unwrap();
      dispatch(clearCart());
      hapticSuccess();
      showToast({ message: t('checkout.orderPlaced'), type: 'success' });
      router.replace('/(customer)/orders');
    } catch (error) {
      hapticError();
      const errorCode = typeof error === 'object' && error !== null && 'data' in error ? String((error as { data: unknown }).data) : '';
      let message = errorCode;
      if (errorCode === 'CHECKOUT_001') message = t('checkout.missingAddress');
      else if (errorCode === 'CHECKOUT_002') message = t('checkout.pincodeNotServiceable');
      else if (errorCode === 'CHECKOUT_003') message = t('checkout.minOrderNotMet', { amount: formatPrice(appSettings.min_order_paise) });
      showToast({ message: message || t('common.error'), type: 'error' });
    }
  };

  if (addressesLoading && addresses.length === 0) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} onScroll={handleScroll} scrollEventThrottle={100}>
        <StepIndicator />
        <View style={styles.section} onLayout={handleSectionLayout(0)}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
            <AppButton variant="text" size="sm" onPress={handleAddAddress}>{t('checkout.addNew')}</AppButton>
          </View>
          {addresses.length === 0 ? (
            <AppButton variant="outline" size="md" icon="plus" onPress={handleAddAddress}>{t('checkout.addAddress')}</AppButton>
          ) : (
            <RadioButton.Group value={selectedAddressId || ''} onValueChange={(value) => { const addr = addresses.find((a) => a.id === value); if (addr) handleSelectAddress(addr); }}>
              {addresses.map((address) => (
                <Card key={address.id} mode="outlined" style={[styles.addressCard, selectedAddressId === address.id && styles.addressCardSelected]} onPress={() => handleSelectAddress(address)}>
                  <Card.Content style={styles.addressCardContent}>
                    <RadioButton.Android value={address.id} />
                    <View style={styles.addressContent}>
                      <View style={styles.addressHeader}>
                        <Text variant="titleSmall">{address.label || address.full_name}</Text>
                        {address.is_default && <Chip compact style={styles.defaultChip} textStyle={styles.defaultChipText}>{t('addresses.default')}</Chip>}
                      </View>
                      <Text variant="bodySmall" style={styles.addressName}>{address.full_name}</Text>
                      <Text variant="bodySmall" style={styles.addressLine}>{address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}</Text>
                      <Text variant="bodySmall" style={styles.addressLine}>{address.city}{address.state ? `, ${address.state}` : ''} - {address.pincode}</Text>
                      <Text variant="bodySmall" style={styles.addressPhone}>{address.phone}</Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </RadioButton.Group>
          )}
        </View>

        <View style={styles.section} onLayout={handleSectionLayout(1)}>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('checkout.orderNotes')}</Text>
          <TextInput mode="outlined" placeholder={t('checkout.orderNotesPlaceholder')} value={notes} onChangeText={setNotes} multiline numberOfLines={3} style={styles.notesInput} />
        </View>

        <View style={styles.section} onLayout={handleSectionLayout(2)}>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('checkout.orderSummary')}</Text>
          {items.map((item) => {
            const itemPrice = Math.round(getPerKgPaise(item.product) * item.weight_grams / 1000);
            const weightLabel = item.weight_grams >= 1000 ? `${(item.weight_grams / 1000)}kg` : `${item.weight_grams}g`;
            return (
              <View key={`${item.product_id}-${item.weight_grams}`} style={styles.orderItem}>
                <Text variant="bodyMedium" style={styles.itemName}>{item.product.name} ({weightLabel})</Text>
                <Text variant="bodyMedium" style={styles.itemQty}>x{item.quantity}</Text>
                <Text variant="bodyMedium" style={styles.itemPrice}>{formatPrice(itemPrice * item.quantity)}</Text>
              </View>
            );
          })}
          <Divider style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>{t('checkout.subtotal')}</Text>
            <Text variant="bodyMedium">{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>{t('checkout.shipping')}</Text>
            {shippingCharge === 0 ? (
              <Text variant="bodyMedium" style={{ color: colors.positive, fontFamily: fontFamily.semiBold }}>{t('checkout.free')}</Text>
            ) : (
              <Text variant="bodyMedium">{formatPrice(shippingCharge)}</Text>
            )}
          </View>
          {shippingCharge > 0 && (
            <Text variant="bodySmall" style={{ color: colors.brand, marginBottom: 12 }}>
              {t('checkout.freeShippingHint', { amount: formatPrice(appSettings.free_shipping_threshold_paise - subtotal) })}
            </Text>
          )}
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text variant="headlineSmall" style={{ color: colors.brand, fontFamily: fontFamily.bold }}>{formatPrice(total)}</Text>
          </View>
          {!minOrderMet && (
            <Text variant="bodySmall" style={{ color: colors.negative, marginTop: spacing.sm, textAlign: 'center' }}>
              {t('checkout.minOrderWarning', { amount: formatPrice(appSettings.min_order_paise) })}
            </Text>
          )}
        </View>

        <View style={styles.placeOrderContainer}>
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

const styles = StyleSheet.create({
  stepContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.sm },
  stepWrapper: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  stepLine: { position: 'absolute', top: 18, right: '50%', left: undefined, width: '100%', height: 2, zIndex: -1 },
  stepLabel: { marginTop: 6, color: colors.neutral, textAlign: 'center' },
  stepLabelActive: { color: colors.brand, fontFamily: fontFamily.semiBold },
  container: { flex: 1, backgroundColor: colors.shell },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: colors.surface, padding: spacing.lg, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  addressCard: { marginBottom: 12 },
  addressCardSelected: { borderColor: colors.brand, borderWidth: 2, backgroundColor: '#FFF5F2' },
  addressCardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  addressContent: { flex: 1, marginLeft: spacing.xs },
  addressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  defaultChip: { marginLeft: spacing.sm, backgroundColor: colors.positiveLight, height: 24 },
  defaultChipText: { fontSize: 10, color: colors.positive },
  addressName: { color: colors.text.primary, marginBottom: 2 },
  addressLine: { color: colors.text.secondary },
  addressPhone: { color: colors.text.secondary, marginTop: spacing.xs },
  notesInput: { backgroundColor: colors.surface },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemName: { flex: 1, color: colors.text.primary },
  itemQty: { color: colors.text.secondary, marginHorizontal: 12 },
  itemPrice: { fontFamily: fontFamily.semiBold, color: colors.text.primary },
  divider: { marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  summaryLabel: { color: colors.text.secondary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  totalLabel: { fontFamily: fontFamily.semiBold, color: colors.text.primary },
  placeOrderContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});
