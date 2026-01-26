import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

import { useAppDispatch, useAppSelector } from '../../src/store';
import { selectCartItems, selectCartTotal, clearCart } from '../../src/store/slices/cartSlice';
import {
  selectSelectedAddressId,
  setSelectedAddress,
} from '../../src/store/slices/addressesSlice';
import {
  useGetAddressesQuery,
  useGetAppSettingsQuery,
  useCreateOrderMutation,
} from '../../src/store/apiSlice';
import { formatPrice, calculateShipping, isPincodeServiceable, DEFAULT_APP_SETTINGS } from '../../src/constants';
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

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const shippingCharge = calculateShipping(subtotal, appSettings);
  const total = subtotal + shippingCharge;
  const minOrderMet = subtotal >= appSettings.min_order_paise;

  // Auto-select default address when addresses load
  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const defaultAddr = addresses.find((a: Address) => a.is_default);
      dispatch(setSelectedAddress(defaultAddr?.id || addresses[0].id));
    }
  }, [addresses, selectedAddressId, dispatch]);

  const handleSelectAddress = (address: Address) => {
    dispatch(setSelectedAddress(address.id));
  };

  const handleAddAddress = () => {
    router.push('/(customer)/addresses/new');
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || !selectedAddress) {
      Alert.alert(t('common.error'), t('checkout.selectAddress'));
      return;
    }

    if (!minOrderMet) {
      Alert.alert(
        t('common.error'),
        t('checkout.minOrderNotMet', { amount: formatPrice(appSettings.min_order_paise) })
      );
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
      await createOrder({
        items: orderItems,
        address_id: selectedAddressId,
        notes: notes || undefined,
      }).unwrap();

      dispatch(clearCart());
      Alert.alert(t('checkout.orderPlaced'), '', [
        {
          text: 'OK',
          onPress: () => router.replace('/(customer)/orders'),
        },
      ]);
    } catch (error) {
      const errorCode = typeof error === 'object' && error !== null && 'data' in error
        ? String((error as { data: unknown }).data)
        : '';
      let message = errorCode;
      if (errorCode === 'CHECKOUT_001') {
        message = t('checkout.missingAddress');
      } else if (errorCode === 'CHECKOUT_002') {
        message = t('checkout.pincodeNotServiceable');
      } else if (errorCode === 'CHECKOUT_003') {
        message = t('checkout.minOrderNotMet', { amount: formatPrice(appSettings.min_order_paise) });
      }
      Alert.alert(t('common.error'), message || t('common.error'));
    }
  };

  if (addressesLoading && addresses.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        {/* Address Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
            <Button mode="text" compact onPress={handleAddAddress}>
              {t('checkout.addNew')}
            </Button>
          </View>

          {addresses.length === 0 ? (
            <Button
              mode="outlined"
              icon="plus"
              onPress={handleAddAddress}
              style={styles.addAddressButton}
            >
              {t('checkout.addAddress')}
            </Button>
          ) : (
            <RadioButton.Group
              value={selectedAddressId || ''}
              onValueChange={(value) => {
                const addr = addresses.find((a) => a.id === value);
                if (addr) handleSelectAddress(addr);
              }}
            >
              {addresses.map((address) => (
                <Card
                  key={address.id}
                  mode="outlined"
                  style={[
                    styles.addressCard,
                    selectedAddressId === address.id && styles.addressCardSelected,
                  ]}
                  onPress={() => handleSelectAddress(address)}
                >
                  <Card.Content style={styles.addressCardContent}>
                    <RadioButton.Android value={address.id} />
                    <View style={styles.addressContent}>
                      <View style={styles.addressHeader}>
                        <Text variant="titleSmall">
                          {address.label || address.full_name}
                        </Text>
                        {address.is_default && (
                          <Chip compact style={styles.defaultChip} textStyle={styles.defaultChipText}>
                            {t('addresses.default')}
                          </Chip>
                        )}
                      </View>
                      <Text variant="bodySmall" style={styles.addressName}>{address.full_name}</Text>
                      <Text variant="bodySmall" style={styles.addressLine}>
                        {address.address_line1}
                        {address.address_line2 ? `, ${address.address_line2}` : ''}
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

        {/* Order Notes */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('checkout.orderNotes')}</Text>
          <TextInput
            mode="outlined"
            placeholder={t('checkout.orderNotesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('checkout.orderSummary')}</Text>
          {items.map((item) => (
            <View key={`${item.product_id}-${item.weight_option_id}`} style={styles.orderItem}>
              <Text variant="bodyMedium" style={styles.itemName}>
                {item.product.name} ({item.weight_option.weight_label || `${item.weight_option.weight_grams}g`})
              </Text>
              <Text variant="bodyMedium" style={styles.itemQty}>x{item.quantity}</Text>
              <Text variant="bodyMedium" style={styles.itemPrice}>
                {formatPrice(item.weight_option.price_paise * item.quantity)}
              </Text>
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
              <Text variant="bodyMedium" style={{ color: theme.custom.success, fontWeight: '600' }}>
                {t('checkout.free')}
              </Text>
            ) : (
              <Text variant="bodyMedium">{formatPrice(shippingCharge)}</Text>
            )}
          </View>

          {shippingCharge > 0 && (
            <Text variant="bodySmall" style={{ color: theme.colors.primary, marginBottom: 12 }}>
              {t('checkout.freeShippingHint', {
                amount: formatPrice(appSettings.free_shipping_threshold_paise - subtotal),
              })}
            </Text>
          )}

          <Divider style={styles.divider} />

          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {formatPrice(total)}
            </Text>
          </View>

          {!minOrderMet && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 8, textAlign: 'center' }}>
              {t('checkout.minOrderWarning', { amount: formatPrice(appSettings.min_order_paise) })}
            </Text>
          )}
        </View>

        <Button
          mode="contained"
          onPress={handlePlaceOrder}
          loading={ordersLoading}
          disabled={ordersLoading || !selectedAddressId || !minOrderMet}
          style={styles.placeOrderButton}
          contentStyle={styles.placeOrderContent}
          labelStyle={styles.placeOrderLabel}
        >
          {t('checkout.placeOrder')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#333333',
  },
  addAddressButton: {
    borderStyle: 'dashed',
    padding: 8,
  },
  addressCard: {
    marginBottom: 12,
  },
  addressCardSelected: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    backgroundColor: '#FFF5F2',
  },
  addressCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressContent: {
    flex: 1,
    marginLeft: 4,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  defaultChip: {
    marginLeft: 8,
    backgroundColor: '#E8F5E9',
    height: 24,
  },
  defaultChipText: {
    fontSize: 10,
    color: '#4CAF50',
  },
  addressName: {
    color: '#333333',
    marginBottom: 2,
  },
  addressLine: {
    color: '#666666',
  },
  addressPhone: {
    color: '#666666',
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  itemName: {
    flex: 1,
    color: '#333333',
  },
  itemQty: {
    color: '#666666',
    marginHorizontal: 12,
  },
  itemPrice: {
    fontWeight: '600',
    color: '#333333',
  },
  divider: {
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#666666',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontWeight: '600',
    color: '#333333',
  },
  placeOrderButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 8,
  },
  placeOrderContent: {
    paddingVertical: 8,
  },
  placeOrderLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
});
