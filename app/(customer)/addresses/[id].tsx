import { useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useHeaderHeight } from '@react-navigation/elements';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { useGetAddressesQuery, useUpdateAddressMutation, useGetAppSettingsQuery } from '../../../src/store/apiSlice';
import { DEFAULT_APP_SETTINGS, isPincodeServiceable } from '../../../src/constants';
import { colors, spacing } from '../../../src/constants/theme';
import { addressSchema, AddressFormData } from '../../../src/validation/schemas';
import { FormTextInput } from '../../../src/components/common/FormTextInput';
import { AppButton } from '../../../src/components/common/AppButton';
import { FioriSwitch } from '../../../src/components/common/FioriSwitch';
import { useToast } from '../../../src/components/common/Toast';

export default function EditAddressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { data: addresses = [] } = useGetAddressesQuery();
  const { data: appSettings = DEFAULT_APP_SETTINGS } = useGetAppSettingsQuery();
  const [updateAddress, { isLoading }] = useUpdateAddressMutation();
  const { showToast } = useToast();
  const address = addresses.find((a) => a.id === id);

  const { control, handleSubmit, setError, reset } = useForm<AddressFormData>({
    resolver: yupResolver(addressSchema),
    defaultValues: { label: '', full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false },
  });

  useEffect(() => {
    if (address) {
      reset({ label: address.label || '', full_name: address.full_name, phone: address.phone.replace('+91', ''), address_line1: address.address_line1, address_line2: address.address_line2 || '', city: address.city, state: address.state || '', pincode: address.pincode, is_default: address.is_default });
    }
  }, [address, reset]);

  const onSubmit = async (data: AddressFormData) => {
    if (!id) return;
    if (!isPincodeServiceable(data.pincode, appSettings)) { setError('pincode', { message: t('checkout.pincodeNotServiceable') }); return; }
    const phoneNumber = data.phone.replace(/\D/g, '').slice(-10);
    try {
      await updateAddress({ id, updates: { label: data.label?.trim() || undefined, full_name: data.full_name.trim(), phone: `+91${phoneNumber}`, address_line1: data.address_line1.trim(), address_line2: data.address_line2?.trim() || undefined, city: data.city.trim(), state: data.state?.trim() || undefined, pincode: data.pincode.trim(), is_default: data.is_default } }).unwrap();
      router.back();
    } catch { showToast({ message: t('addresses.errors.saveFailed'), type: 'error' }); }
  };

  if (!address) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.brand} /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <FormTextInput control={control} name="label" mode="outlined" label={t('addresses.label')} placeholder={t('addresses.labelPlaceholder')} style={styles.input} />
          <FormTextInput control={control} name="full_name" mode="outlined" label={`${t('addresses.fullName')} *`} placeholder={t('addresses.fullNamePlaceholder')} style={styles.input} />
          <FormTextInput control={control} name="phone" mode="outlined" label={`${t('addresses.phone')} *`} placeholder={t('addresses.phonePlaceholder')} keyboardType="phone-pad" maxLength={14} style={styles.input} />
          <FormTextInput control={control} name="address_line1" mode="outlined" label={`${t('checkout.addressLine1')} *`} placeholder={t('addresses.addressLine1Placeholder')} style={styles.input} />
          <FormTextInput control={control} name="address_line2" mode="outlined" label={t('checkout.addressLine2')} placeholder={t('addresses.addressLine2Placeholder')} style={styles.input} />
          <View style={styles.row}>
            <View style={styles.halfField}><FormTextInput control={control} name="city" mode="outlined" label={`${t('checkout.city')} *`} placeholder={t('addresses.cityPlaceholder')} style={styles.input} /></View>
            <View style={styles.halfField}><FormTextInput control={control} name="state" mode="outlined" label={t('addresses.state')} placeholder={t('addresses.statePlaceholder')} style={styles.input} /></View>
          </View>
          <FormTextInput control={control} name="pincode" mode="outlined" label={`${t('checkout.pincode')} *`} placeholder={t('addresses.pincodePlaceholder')} keyboardType="number-pad" maxLength={6} style={styles.input} />
          <Controller control={control} name="is_default" render={({ field: { onChange, value } }) => <FioriSwitch label={t('addresses.setAsDefault')} value={value} onValueChange={onChange} />} />
        </View>
        <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.xl }}>
          <AppButton variant="primary" size="lg" fullWidth onPress={handleSubmit(onSubmit)} loading={isLoading} disabled={isLoading}>{t('common.save')}</AppButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  scrollContent: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: colors.surface, padding: spacing.md, marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
});
