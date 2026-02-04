import { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Text,
  TextInput,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { selectSelectedAddressId, setSelectedAddress } from '../../src/store/slices/addressesSlice';
import {
  useGetAddressesQuery,
  useGetAppSettingsQuery,
  useCreateOrderMutation,
  useGetCartQuery,
  useClearServerCartMutation,
} from '../../src/store/apiSlice';
import { formatPrice, calculateShipping, isPincodeServiceable, DEFAULT_APP_SETTINGS, resolveImageSource } from '../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme';
import { Address } from '../../src/types';
import { AppButton } from '../../src/components/common/AppButton';
import { FioriChip } from '../../src/components/common/FioriChip';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { useToast } from '../../src/components/common/Toast';
import { Toolbar } from '../../src/components/common/Toolbar';
import { EmptyState } from '../../src/components/common/EmptyState';
import { hapticSuccess, hapticError } from '../../src/utils/haptics';
import { formatWeight } from '../../src/utils/formatters';

const NOTES_MAX_LENGTH = 200; // #17: Character limit for order notes

export default function CheckoutScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { appColors, appGradients } = useAppTheme();
  const isGujarati = i18n.language === 'gu';

  // Server-side cart
  const { data: items = [], isLoading: cartLoading } = useGetCartQuery();
  const [clearServerCart] = useClearServerCartMutation();

  // Calculate subtotal from server cart (use line_total_paise from RPC)
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.line_total_paise, 0);
  }, [items]);

  const selectedAddressId = useAppSelector(selectSelectedAddressId);
  const user = useAppSelector((state) => state.auth.user);

  const { data: addresses = [], isLoading: addressesLoading } = useGetAddressesQuery();
  const { data: appSettings = DEFAULT_APP_SETTINGS } = useGetAppSettingsQuery();
  const [createOrder, { isLoading: ordersLoading }] = useCreateOrderMutation();

  const [notes, setNotes] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false); // Notes collapsed by default

  // Navigate to address list to change address
  const handleChangeAddress = () => {
    router.push('/(customer)/addresses');
  };

  const { selectedAddress, shippingCharge, total, minOrderMet } = useMemo(() => {
    const addr = addresses.find((a) => a.id === selectedAddressId);
    const shipping = calculateShipping(subtotal, appSettings);
    return {
      selectedAddress: addr,
      shippingCharge: shipping,
      total: subtotal + shipping,
      minOrderMet: subtotal >= appSettings.min_order_paise,
    };
  }, [addresses, selectedAddressId, subtotal, appSettings]);

  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const defaultAddr = addresses.find((a: Address) => a.is_default);
      dispatch(setSelectedAddress(defaultAddr?.id || addresses[0].id));
    }
  }, [addresses, selectedAddressId, dispatch]);

  const handleAddAddress = () => {
    if (!user?.name?.trim()) {
      showToast({ message: t('addresses.errors.nameRequired'), type: 'error' });
      router.push('/(customer)/profile');
      return;
    }
    router.push('/(customer)/addresses/new');
  };

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

    // Build order items from server cart (use weight_grams from flat structure)
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
      // Clear server cart after successful order
      await clearServerCart().unwrap();
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

  if ((addressesLoading && addresses.length === 0) || cartLoading) {
    return <View style={[styles.centered, { backgroundColor: appColors.shell }]}><ActivityIndicator size="large" color={appColors.brand} /></View>;
  }

  // No addresses: show empty state prompting to add address
  if (addresses.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: appColors.shell }]}>
        <EmptyState
          icon="map-marker-off"
          title={t('addresses.empty')}
          subtitle={t('checkout.noSavedAddresses')}
          actionLabel={t('checkout.addAddress')}
          onAction={handleAddAddress}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: appColors.shell }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.container, { backgroundColor: appColors.shell }]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Selected Address Summary (1-line, tappable to change) */}
        {selectedAddress && (
          <Pressable
            onPress={handleChangeAddress}
            style={[styles.addressSummaryCard, { backgroundColor: appColors.surface, borderColor: appColors.border }, elevation.level1]}
          >
            <View style={styles.addressSummaryContent}>
              <MaterialCommunityIcons name="map-marker" size={18} color={appColors.brand} />
              <Text variant="bodyMedium" style={[styles.addressSummaryText, { color: appColors.text.primary }]} numberOfLines={1}>
                {selectedAddress.label || selectedAddress.full_name}, {selectedAddress.address_line1}, {selectedAddress.city} - {selectedAddress.pincode}
              </Text>
            </View>
            <View style={styles.addressSummaryAction}>
              <Text variant="labelSmall" style={{ color: appColors.brand }}>{t('common.change')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={appColors.brand} />
            </View>
          </Pressable>
        )}

        {/* Order Summary */}
        <View style={[styles.summaryCard, { backgroundColor: appColors.surface }, elevation.level2]}>
          <View style={styles.summaryBody}>
            <SectionHeader
              title={`${t('checkout.orderSummary')} (${items.length})`}
              style={{ paddingHorizontal: 0 }}
              actionLabel={t('common.edit')}
              onAction={() => router.back()}
            />

            {/* Line Items */}
            {items.map((item, idx) => {
              const isLast = idx === items.length - 1;
              const imgSource = item.product_image_url
                ? resolveImageSource(item.product_image_url, null)
                : null;
              const displayName = isGujarati && item.product_name_gu ? item.product_name_gu : item.product_name;
              return (
                <View key={item.id} style={[styles.orderItem, { borderBottomColor: appColors.border }, isLast && styles.orderItemLast]}>
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
                    <Text variant="bodySmall" style={[styles.itemWeight, { color: appColors.text.secondary }]}>{formatWeight(item.weight_grams, { label: item.weight_label })}</Text>
                  </View>
                  <View style={[styles.itemQtyBadge, { backgroundColor: appColors.informativeLight }]}>
                    <Text variant="labelSmall" style={[styles.itemQtyText, { color: appColors.informative }]}>x{item.quantity}</Text>
                  </View>
                  <Text variant="bodyMedium" style={[styles.itemPrice, { color: appColors.text.primary }]}>{formatPrice(item.line_total_paise)}</Text>
                </View>
              );
            })}

            {/* Breakdown - aligned with item prices */}
            <Divider style={styles.divider} />
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabel}>
                <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>{t('checkout.subtotal')}</Text>
              </View>
              <Text variant="bodyMedium" style={[styles.breakdownValue, { color: appColors.text.primary }]}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabel}>
                <Text variant="bodyMedium" style={{ color: appColors.text.secondary }}>{t('checkout.shipping')}</Text>
              </View>
              {shippingCharge === 0 ? (
                <View style={[styles.breakdownValue, styles.freeShippingBadge]}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={appColors.positive} />
                  <Text variant="bodyMedium" style={{ color: appColors.positive, fontFamily: fontFamily.bold, marginLeft: spacing.xs }}>{t('checkout.free')}</Text>
                </View>
              ) : (
                <Text variant="bodyMedium" style={[styles.breakdownValue, { color: appColors.text.primary }]}>{formatPrice(shippingCharge)}</Text>
              )}
            </View>

            {/* Min Order Warning - Fiori Inline Validation (no background) */}
            {!minOrderMet && (
              <View style={styles.minOrderRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.negative} />
                <Text variant="bodySmall" style={{ color: appColors.negative, marginLeft: spacing.xs, flex: 1 }}>
                  {t('checkout.minOrderWarning', { amount: formatPrice(appSettings.min_order_paise) })}
                </Text>
              </View>
            )}
          </View>

          {/* Total (full-bleed highlight) */}
          <View style={[styles.totalHighlight, { backgroundColor: appColors.brandTint, borderTopColor: appColors.border }]}>
            <Text variant="titleMedium" style={{ fontFamily: fontFamily.semiBold, color: appColors.text.primary }}>{t('cart.total')}</Text>
            <Text variant="headlineSmall" style={{ color: appColors.brand, fontFamily: fontFamily.bold }}>{formatPrice(total)}</Text>
          </View>
        </View>

        {/* Order Notes (Collapsible, default collapsed) */}
        <View style={[styles.card, { backgroundColor: appColors.surface, padding: 0 }, elevation.level2]}>
          <Pressable
            onPress={() => setNotesExpanded(!notesExpanded)}
            style={styles.notesHeader}
          >
            <View style={styles.notesHeaderLeft}>
              <MaterialCommunityIcons name="note-text-outline" size={20} color={appColors.text.secondary} />
              <Text variant="titleSmall" style={{ color: appColors.text.primary, marginLeft: spacing.sm }}>
                {t('checkout.orderNotes')}
              </Text>
              {notes.length > 0 && (
                <View style={{ marginLeft: spacing.sm }}>
                  <FioriChip label={t('common.edit')} variant="informative" />
                </View>
              )}
            </View>
            <MaterialCommunityIcons
              name={notesExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={appColors.text.secondary}
            />
          </Pressable>

          {notesExpanded && (
            <View style={styles.notesBody}>
              <TextInput
                mode="outlined"
                placeholder={t('checkout.orderNotesPlaceholder')}
                value={notes}
                onChangeText={(text) => setNotes(text.slice(0, NOTES_MAX_LENGTH))}
                multiline
                numberOfLines={3}
                maxLength={NOTES_MAX_LENGTH}
                style={[styles.notesInput, { backgroundColor: appColors.surface }]}
                contentStyle={styles.notesContent}
                outlineColor={appColors.fieldBorder}
                activeOutlineColor={appColors.brand}
                outlineStyle={styles.notesOutline}
              />
              <Text variant="labelSmall" style={[styles.charCounter, { color: appColors.text.secondary }]}>
                {notes.length}/{NOTES_MAX_LENGTH}
              </Text>
            </View>
          )}
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Section Cards
  card: {
    padding: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },

  // Notes
  notesInput: { minHeight: 88 },
  notesContent: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  notesOutline: { borderRadius: borderRadius.md },
  // #17: Character counter
  charCounter: { textAlign: 'right', marginTop: spacing.xs },

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
    borderRadius: 8, // Fiori: 8pt for object images
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

  // Breakdown (aligned with item prices)
  divider: { marginVertical: spacing.md },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44, // Fiori Key-Value Cell min height
    marginBottom: spacing.xs,
  },
  breakdownLabel: {
    flex: 1,
  },
  breakdownValue: {
    minWidth: 64,
    textAlign: 'right',
    fontFamily: fontFamily.semiBold,
  },
  freeShippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  // Total (full-bleed footer)
  totalHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },

  // Validation - Fiori Inline Validation (no background)
  minOrderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },

  // Toolbar
  toolbarInner: { flex: 1 },

  // Address Summary
  addressSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  addressSummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  addressSummaryText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  addressSummaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Collapsible Notes
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  notesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
