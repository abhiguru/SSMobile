import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, TextInput, findNodeHandle, UIManager } from 'react-native';
import { useRef, useEffect, useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native-paper';
import { useHeaderHeight } from '@react-navigation/elements';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { useAddAddressMutation, useGetAppSettingsQuery, useUpdateProfileMutation } from '../../../src/store/apiSlice';
import { useAppSelector } from '../../../src/store';
import { DEFAULT_APP_SETTINGS, isPincodeServiceable } from '../../../src/constants';
import { spacing } from '../../../src/constants/theme';
import { useAppTheme } from '../../../src/theme';
import { addressSchema, AddressFormData } from '../../../src/validation/schemas';
import { FormTextInput } from '../../../src/components/common/FormTextInput';
import { PlacesAutocomplete } from '../../../src/components/common/PlacesAutocomplete';
import { InlineMapPicker } from '../../../src/components/common/InlineMapPicker';
import { AppButton } from '../../../src/components/common/AppButton';
import { FioriSwitch } from '../../../src/components/common/FioriSwitch';

export default function NewAddressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { appColors } = useAppTheme();
  const { data: appSettings = DEFAULT_APP_SETTINGS } = useGetAppSettingsQuery();
  const [addAddress, { isLoading }] = useAddAddressMutation();
  const [updateProfile] = useUpdateProfileMutation();
  const user = useAppSelector((state) => state.auth.user);
  const needsName = !user?.name?.trim();
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      const focused = TextInput.State.currentlyFocusedInput();
      if (!focused || !scrollViewRef.current) return;
      const scrollNodeHandle = findNodeHandle(scrollViewRef.current);
      if (!scrollNodeHandle) return;
      UIManager.measureLayout(
        findNodeHandle(focused)!,
        scrollNodeHandle,
        () => {},
        (_x, y) => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
        },
      );
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const labelTouchedRef = useRef(false);
  const nameTouchedRef = useRef(false);

  const { control, handleSubmit, setError, setValue, watch, reset } = useForm<AddressFormData>({
    resolver: yupResolver(addressSchema),
    defaultValues: { label: '', full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false, lat: null, lng: null, formatted_address: null },
  });

  useFocusEffect(useCallback(() => {
    reset();
    labelTouchedRef.current = false;
    nameTouchedRef.current = false;
    setMapKey((k) => k + 1);
  }, [reset]));

  const onSubmit = async (data: AddressFormData) => {
    console.log('[NewAddress] onSubmit called, data:', JSON.stringify(data));
    if (!isPincodeServiceable(data.pincode, appSettings)) { setError('pincode', { message: t('checkout.pincodeNotServiceable') }); return; }
    const fullName = data.full_name?.trim() || user?.name?.trim() || '';
    if (!fullName) { setError('full_name', { message: t('addresses.validation.nameRequired') }); return; }
    let phone = data.phone?.trim() || user?.phone || '';
    if (phone && !phone.startsWith('+')) {
      phone = `+91${phone.replace(/\D/g, '').slice(-10)}`;
    }
    const payload = { label: data.label?.trim() || undefined, full_name: fullName, phone, address_line1: data.address_line1.trim(), address_line2: data.address_line2?.trim() || undefined, city: data.city.trim(), state: data.state?.trim() || undefined, pincode: data.pincode.trim(), is_default: data.is_default, lat: data.lat ?? null, lng: data.lng ?? null, formatted_address: data.formatted_address ?? null };
    console.log('[NewAddress] API payload:', JSON.stringify(payload));
    try {
      // If user had no name, save it to their profile too
      if (needsName && fullName) {
        updateProfile({ name: fullName }).catch(() => {});
      }
      const result = await addAddress(payload).unwrap();
      console.log('[NewAddress] addAddress success:', JSON.stringify(result));
      router.back();
    } catch (err) {
      console.error('[NewAddress] addAddress error:', err);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
      <ScrollView ref={scrollViewRef} style={[styles.container, { backgroundColor: appColors.shell }]} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + keyboardHeight }]}>
        <View style={[styles.section, { backgroundColor: appColors.surface }]}>
          <FormTextInput control={control} name="label" mode="outlined" label={t('addresses.label')} placeholder={t('addresses.labelPlaceholder')} style={[styles.input, { backgroundColor: appColors.surface }]} onChangeText={(text: string) => { labelTouchedRef.current = true; if (!nameTouchedRef.current) setValue('full_name', text); }} />
          <FormTextInput control={control} name="full_name" mode="outlined" label={needsName ? `${t('addresses.fullName')} *` : t('addresses.fullName')} placeholder={t('addresses.fullNamePlaceholder')} style={[styles.input, { backgroundColor: appColors.surface }]} onChangeText={(text: string) => { nameTouchedRef.current = true; if (!labelTouchedRef.current) setValue('label', text); }} />
          <FormTextInput control={control} name="phone" mode="outlined" label={t('addresses.phone')} placeholder={t('addresses.phonePlaceholder')} keyboardType="phone-pad" style={[styles.input, { backgroundColor: appColors.surface }]} />
          <InlineMapPicker
            key={mapKey}
            lat={watch('lat')}
            lng={watch('lng')}
            onUseAddress={(details) => {
              setValue('address_line1', details.addressLine1);
              setValue('address_line2', details.addressLine2);
              setValue('city', details.city);
              setValue('state', details.state);
              setValue('pincode', details.pincode);
              setValue('lat', details.lat);
              setValue('lng', details.lng);
              setValue('formatted_address', details.formattedAddress);
            }}
            onClearAddress={() => {
              setValue('address_line1', '');
              setValue('address_line2', '');
              setValue('city', '');
              setValue('state', '');
              setValue('pincode', '');
              setValue('lat', null);
              setValue('lng', null);
              setValue('formatted_address', null);
            }}
          />
          <Controller control={control} name="address_line1" render={({ field: { onChange, value } }) => (
            <PlacesAutocomplete
              value={value}
              onChangeText={onChange}
              onPlaceSelected={(details) => {
                onChange(details.addressLine1);
                setValue('address_line2', details.addressLine2);
                setValue('city', details.city);
                setValue('state', details.state);
                setValue('pincode', details.pincode);
                setValue('lat', details.lat);
                setValue('lng', details.lng);
                setValue('formatted_address', details.formattedAddress);
              }}
              label={`${t('checkout.addressLine1')} *`}
              placeholder={t('addresses.addressLine1Placeholder')}
              onClear={watch('lat') != null ? () => {
                onChange('');
                setValue('address_line2', '');
                setValue('city', '');
                setValue('state', '');
                setValue('pincode', '');
                setValue('lat', null);
                setValue('lng', null);
                setValue('formatted_address', null);
              } : undefined}
            />
          )} />
          <FormTextInput control={control} name="address_line2" mode="outlined" label={t('checkout.addressLine2')} placeholder={t('addresses.addressLine2Placeholder')} style={[styles.input, { backgroundColor: appColors.surface }]} />
          <View style={styles.row}>
            <View style={styles.halfField}><FormTextInput control={control} name="city" mode="outlined" label={`${t('checkout.city')} *`} placeholder={t('addresses.cityPlaceholder')} style={[styles.input, { backgroundColor: appColors.surface }]} /></View>
            <View style={styles.halfField}><FormTextInput control={control} name="state" mode="outlined" label={t('addresses.state')} placeholder={t('addresses.statePlaceholder')} style={[styles.input, { backgroundColor: appColors.surface }]} /></View>
          </View>
          <FormTextInput control={control} name="pincode" mode="outlined" label={`${t('checkout.pincode')} *`} placeholder={t('addresses.pincodePlaceholder')} keyboardType="number-pad" maxLength={6} style={[styles.input, { backgroundColor: appColors.surface }]} />
          <Controller control={control} name="is_default" render={({ field: { onChange, value } }) => <FioriSwitch label={t('addresses.setAsDefault')} value={value} onValueChange={onChange} />} />
        </View>
        <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.xl }}>
          <AppButton variant="primary" size="lg" fullWidth onPress={handleSubmit(onSubmit, (errors) => console.log('[NewAddress] validation errors:', JSON.stringify(errors)))} loading={isLoading} disabled={isLoading}>{t('common.save')}</AppButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  section: { padding: spacing.md, marginBottom: spacing.md },
  input: { marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
});
