import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { selectCartItems, selectCartTotal, clearCart } from '../../src/store/slices/cartSlice';
import { createOrder } from '../../src/store/slices/ordersSlice';
import {
  selectAddresses,
  selectSelectedAddressId,
  setSelectedAddress,
  fetchAddresses,
} from '../../src/store/slices/addressesSlice';
import {
  selectAppSettings,
  calculateShipping,
  isPincodeServiceable,
} from '../../src/store/slices/settingsSlice';
import { formatPrice } from '../../src/constants';
import { Address } from '../../src/types';

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartTotal);
  const addresses = useAppSelector(selectAddresses);
  const selectedAddressId = useAppSelector(selectSelectedAddressId);
  const appSettings = useAppSelector(selectAppSettings);
  const { isLoading: ordersLoading } = useAppSelector((state) => state.orders);
  const { isLoading: addressesLoading } = useAppSelector((state) => state.addresses);

  const [notes, setNotes] = useState('');

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const shippingCharge = calculateShipping(subtotal, appSettings);
  const total = subtotal + shippingCharge;
  const minOrderMet = subtotal >= appSettings.min_order_paise;

  useEffect(() => {
    if (addresses.length === 0) {
      dispatch(fetchAddresses());
    }
  }, [dispatch, addresses.length]);

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

    // Check if pincode is serviceable
    if (!isPincodeServiceable(selectedAddress.pincode, appSettings)) {
      Alert.alert(t('common.error'), t('checkout.pincodeNotServiceable'));
      return;
    }

    const orderItems = items.map((item) => ({
      product_id: item.product_id,
      weight_option_id: item.weight_option_id,
      quantity: item.quantity,
    }));

    const result = await dispatch(
      createOrder({
        items: orderItems,
        address_id: selectedAddressId,
        notes: notes || undefined,
      })
    );

    if (createOrder.fulfilled.match(result)) {
      dispatch(clearCart());
      Alert.alert(t('checkout.orderPlaced'), '', [
        {
          text: 'OK',
          onPress: () => router.replace('/(customer)/orders'),
        },
      ]);
    } else if (createOrder.rejected.match(result)) {
      const errorCode = result.payload as string;
      let message = errorCode;
      if (errorCode === 'CHECKOUT_001') {
        message = t('checkout.missingAddress');
      } else if (errorCode === 'CHECKOUT_002') {
        message = t('checkout.pincodeNotServiceable');
      } else if (errorCode === 'CHECKOUT_003') {
        message = t('checkout.minOrderNotMet', { amount: formatPrice(appSettings.min_order_paise) });
      }
      Alert.alert(t('common.error'), message);
    }
  };

  if (addressesLoading && addresses.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
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
            <Text style={styles.sectionTitle}>{t('checkout.deliveryAddress')}</Text>
            <TouchableOpacity onPress={handleAddAddress}>
              <Text style={styles.addLink}>{t('checkout.addNew')}</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <TouchableOpacity style={styles.addAddressButton} onPress={handleAddAddress}>
              <Text style={styles.addAddressText}>{t('checkout.addAddress')}</Text>
            </TouchableOpacity>
          ) : (
            addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.addressCard,
                  selectedAddressId === address.id && styles.addressCardSelected,
                ]}
                onPress={() => handleSelectAddress(address)}
              >
                <View style={styles.addressRadio}>
                  <View
                    style={[
                      styles.radioOuter,
                      selectedAddressId === address.id && styles.radioOuterSelected,
                    ]}
                  >
                    {selectedAddressId === address.id && <View style={styles.radioInner} />}
                  </View>
                </View>
                <View style={styles.addressContent}>
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressLabel}>
                      {address.label || address.full_name}
                    </Text>
                    {address.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>{t('addresses.default')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressName}>{address.full_name}</Text>
                  <Text style={styles.addressLine}>
                    {address.address_line1}
                    {address.address_line2 ? `, ${address.address_line2}` : ''}
                  </Text>
                  <Text style={styles.addressLine}>
                    {address.city}{address.state ? `, ${address.state}` : ''} - {address.pincode}
                  </Text>
                  <Text style={styles.addressPhone}>{address.phone}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Order Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.orderNotes')}</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder={t('checkout.orderNotesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.orderSummary')}</Text>
          {items.map((item) => (
            <View key={`${item.product_id}-${item.weight_option_id}`} style={styles.orderItem}>
              <Text style={styles.itemName}>
                {item.product.name} ({item.weight_option.weight_label || `${item.weight_option.weight_grams}g`})
              </Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>
                {formatPrice(item.weight_option.price_paise * item.quantity)}
              </Text>
            </View>
          ))}

          <View style={styles.summaryDivider} />

          {/* Subtotal */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('checkout.subtotal')}</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>

          {/* Shipping */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('checkout.shipping')}</Text>
            {shippingCharge === 0 ? (
              <Text style={styles.freeShipping}>{t('checkout.free')}</Text>
            ) : (
              <Text style={styles.summaryValue}>{formatPrice(shippingCharge)}</Text>
            )}
          </View>

          {/* Free shipping message */}
          {shippingCharge > 0 && (
            <Text style={styles.freeShippingHint}>
              {t('checkout.freeShippingHint', {
                amount: formatPrice(appSettings.free_shipping_threshold_paise - subtotal),
              })}
            </Text>
          )}

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text style={styles.totalAmount}>{formatPrice(total)}</Text>
          </View>

          {/* Minimum order warning */}
          {!minOrderMet && (
            <Text style={styles.minOrderWarning}>
              {t('checkout.minOrderWarning', { amount: formatPrice(appSettings.min_order_paise) })}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            (ordersLoading || !selectedAddressId || !minOrderMet) && styles.buttonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={ordersLoading || !selectedAddressId || !minOrderMet}
        >
          <Text style={styles.placeOrderText}>
            {ordersLoading ? t('common.loading') : t('checkout.placeOrder')}
          </Text>
        </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  addLink: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  addAddressButton: {
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  addAddressText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '500',
  },
  addressCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  addressCardSelected: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    backgroundColor: '#FFF5F2',
  },
  addressRadio: {
    marginRight: 12,
    paddingTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#FF6B35',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B35',
  },
  addressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  defaultBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
  addressName: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 14,
    color: '#666666',
  },
  addressPhone: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 0,
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
    fontSize: 14,
    color: '#333333',
  },
  itemQty: {
    fontSize: 14,
    color: '#666666',
    marginHorizontal: 12,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333333',
  },
  freeShipping: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  freeShippingHint: {
    fontSize: 12,
    color: '#FF6B35',
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  minOrderWarning: {
    fontSize: 12,
    color: '#E53935',
    marginTop: 8,
    textAlign: 'center',
  },
  placeOrderButton: {
    backgroundColor: '#FF6B35',
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#FFAB91',
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
