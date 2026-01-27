import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
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
  Button,
  Card,
  Chip,
  RadioButton,
  Divider,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { selectCartItems, selectCartTotal, clearCart } from '../../src/store/slices/cartSlice';
import { selectSelectedAddressId, setSelectedAddress } from '../../src/store/slices/addressesSlice';
import { useGetAddressesQuery, useGetAppSettingsQuery, useCreateOrderMutation } from '../../src/store/apiSlice';
import { formatPrice, calculateShipping, isPincodeServiceable, DEFAULT_APP_SETTINGS } from '../../src/constants';
import { colors, spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { Address } from '../../src/types';
import type { AppTheme } from '../../src/theme';

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();

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

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y + 100;
    const positions = sectionYPositions.current;
    if (y >= positions[2] && positions[2] > 0) setCurrentStep(2);
    else if (y >= positions[1] && positions[1] > 0) setCurrentStep(1);
    else setCurrentStep(0);
  }, []);

  const handleSectionLayout = (index: number) => (e: LayoutChangeEvent) => {
    sectionYPositions.current[index] = e.nativeEvent.layout.y;
  };

  const StepIndicator = () => (
    <View style={styles.stepContainer}>
      {STEPS.map((step, index) => {
        const isActive = index <= currentStep;
        const isCurrent = index === currentStep;
        const circleColor = isCurrent ? colors.primary : isActive ? colors.primaryLight : colors.border.default;
        const iconColor = isActive ? colors.text.inverse : colors.text.muted;
        return (
          <View key={index} style={styles.stepWrapper}>
            {index > 0 && (
              <View style={[styles.stepLine, { backgroundColor: isActive ? colors.primary : colors.border.default }]} />
            )}
            <View style={[styles.stepCircle, { backgroundColor: circleColor }]}>
              <MaterialCommunityIcons name={step.icon} size={18} color={iconColor} />
            </View>
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
      Alert.alert(t('common.error'), t('checkout.selectAddress'));
      return;
    }
    if (!minOrderMet) {
      Alert.alert(t('common.error'), t('checkout.minOrderNotMet', { amount: formatPrice(appSettings.min_order_paise) }));
      return;
    }
    if (!isPincodeServiceable(selectedAddress.pincode, appSettings)) {
      Alert.alert(t('common.error'), t('checkout.pincodeNotServiceable'));
      return;
    }

    const orderItems = items.map((item) => ({
      product_id: item.product_id,
      weight_option_id: item.weight_option_id,
      quantity: item.quantity,
    }));

    try {
      await createOrder({ items: orderItems, address_id: selectedAddressId, notes: notes || undefined }).unwrap();
      dispatch(clearCart());
      Alert.alert(t('checkout.orderPlaced'), '', [{ text: 'OK', onPress: () => router.replace('/(customer)/orders') }]);
    } catch (error) {
      const errorCode = typeof error === 'object' && error !== null && 'data' in error ? String((error as { data: unknown }).data) : '';
      let message = errorCode;
      if (errorCode === 'CHECKOUT_001') message = t('checkout.missingAddress');
      else if (errorCode === 'CHECKOUT_002') message = t('checkout.pincodeNotServiceable');
      else if (errorCode === 'CHECKOUT_003') message = t('checkout.minOrderNotMet', { amount: formatPrice(appSettings.min_order_paise) });
      Alert.alert(t('common.error'), message || t('common.error'));
    }
  };

  if (addressesLoading && addresses.length === 0) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} onScroll={handleScroll} scrollEventThrottle={100}>
        <StepIndicator />
        <View style={styles.section} onLayout={handleSectionLayout(0)}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
            <Button mode="text" compact onPress={handleAddAddress}>{t('checkout.addNew')}</Button>
          </View>
          {addresses.length === 0 ? (
            <Button mode="outlined" icon="plus" onPress={handleAddAddress} style={styles.addAddressButton}>{t('checkout.addAddress')}</Button>
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
          {items.map((item) => (
            <View key={`${item.product_id}-${item.weight_option_id}`} style={styles.orderItem}>
              <Text variant="bodyMedium" style={styles.itemName}>{item.product.name} ({item.weight_option.weight_label || `${item.weight_option.weight_grams}g`})</Text>
              <Text variant="bodyMedium" style={styles.itemQty}>x{item.quantity}</Text>
              <Text variant="bodyMedium" style={styles.itemPrice}>{formatPrice(item.weight_option.price_paise * item.quantity)}</Text>
            </View>
          ))}
          <Divider style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>{t('checkout.subtotal')}</Text>
            <Text variant="bodyMedium">{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>{t('checkout.shipping')}</Text>
            {shippingCharge === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.custom.success, fontWeight: '600' }}>{t('checkout.free')}</Text>
            ) : (
              <Text variant="bodyMedium">{formatPrice(shippingCharge)}</Text>
            )}
          </View>
          {shippingCharge > 0 && (
            <Text variant="bodySmall" style={{ color: theme.colors.primary, marginBottom: 12 }}>
              {t('checkout.freeShippingHint', { amount: formatPrice(appSettings.free_shipping_threshold_paise - subtotal) })}
            </Text>
          )}
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{formatPrice(total)}</Text>
          </View>
          {!minOrderMet && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: spacing.sm, textAlign: 'center' }}>
              {t('checkout.minOrderWarning', { amount: formatPrice(appSettings.min_order_paise) })}
            </Text>
          )}
        </View>

        <Button mode="contained" onPress={handlePlaceOrder} loading={ordersLoading} disabled={ordersLoading || !selectedAddressId || !minOrderMet} style={styles.placeOrderButton} contentStyle={styles.placeOrderContent} labelStyle={styles.placeOrderLabel}>
          {t('checkout.placeOrder')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  stepContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.background.primary, marginBottom: spacing.sm },
  stepWrapper: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  stepLine: { position: 'absolute', top: 18, right: '50%', left: undefined, width: '100%', height: 2, zIndex: -1 },
  stepLabel: { marginTop: 6, color: colors.text.muted, textAlign: 'center' },
  stepLabelActive: { color: colors.primary, fontWeight: '600' },
  container: { flex: 1, backgroundColor: colors.background.secondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: colors.background.primary, padding: spacing.md, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontWeight: '600', color: colors.text.primary },
  addAddressButton: { borderStyle: 'dashed', padding: spacing.sm },
  addressCard: { marginBottom: 12 },
  addressCardSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.secondary },
  addressCardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  addressContent: { flex: 1, marginLeft: spacing.xs },
  addressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  defaultChip: { marginLeft: spacing.sm, backgroundColor: colors.successLight, height: 24 },
  defaultChipText: { fontSize: 10, color: colors.success },
  addressName: { color: colors.text.primary, marginBottom: 2 },
  addressLine: { color: colors.text.secondary },
  addressPhone: { color: colors.text.secondary, marginTop: spacing.xs },
  notesInput: { backgroundColor: colors.background.primary },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  itemName: { flex: 1, color: colors.text.primary },
  itemQty: { color: colors.text.secondary, marginHorizontal: 12 },
  itemPrice: { fontWeight: '600', color: colors.text.primary },
  divider: { marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  summaryLabel: { color: colors.text.secondary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  totalLabel: { fontWeight: '600', color: colors.text.primary },
  placeOrderButton: { marginHorizontal: spacing.md, marginBottom: spacing.xl, borderRadius: borderRadius.md },
  placeOrderContent: { paddingVertical: spacing.sm },
  placeOrderLabel: { fontSize: fontSize.xl, fontWeight: '600' },
});
