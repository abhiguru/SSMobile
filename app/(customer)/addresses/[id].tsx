import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, Button, HelperText, Switch, ActivityIndicator, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../../../src/store';
import { updateAddress, selectAddresses } from '../../../src/store/slices/addressesSlice';
import { selectAppSettings, isPincodeServiceable } from '../../../src/store/slices/settingsSlice';
import { PHONE_REGEX } from '../../../src/constants';
import type { AppTheme } from '../../../src/theme';

export default function EditAddressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme<AppTheme>();
  const addresses = useAppSelector(selectAddresses);
  const appSettings = useAppSelector(selectAppSettings);
  const { isLoading } = useAppSelector((state) => state.addresses);

  const address = addresses.find((a) => a.id === id);

  const [form, setForm] = useState({
    label: '',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (address) {
      const phoneWithoutPrefix = address.phone.replace('+91', '');
      setForm({
        label: address.label || '',
        full_name: address.full_name,
        phone: phoneWithoutPrefix,
        address_line1: address.address_line1,
        address_line2: address.address_line2 || '',
        city: address.city,
        state: address.state || '',
        pincode: address.pincode,
        is_default: address.is_default,
      });
    }
  }, [address]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.full_name.trim()) {
      newErrors.full_name = t('addresses.errors.fullNameRequired');
    }

    if (!form.phone.trim()) {
      newErrors.phone = t('addresses.errors.phoneRequired');
    } else if (!PHONE_REGEX.test(form.phone.replace(/\D/g, '').slice(-10))) {
      newErrors.phone = t('addresses.errors.phoneInvalid');
    }

    if (!form.address_line1.trim()) {
      newErrors.address_line1 = t('addresses.errors.addressRequired');
    }

    if (!form.city.trim()) {
      newErrors.city = t('addresses.errors.cityRequired');
    }

    if (!form.pincode.trim()) {
      newErrors.pincode = t('addresses.errors.pincodeRequired');
    } else if (form.pincode.length !== 6) {
      newErrors.pincode = t('addresses.errors.pincodeInvalid');
    } else if (!isPincodeServiceable(form.pincode, appSettings)) {
      newErrors.pincode = t('checkout.pincodeNotServiceable');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!id || !validateForm()) {
      return;
    }

    const phoneNumber = form.phone.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91${phoneNumber}`;

    const result = await dispatch(
      updateAddress({
        id,
        updates: {
          label: form.label.trim() || undefined,
          full_name: form.full_name.trim(),
          phone: formattedPhone,
          address_line1: form.address_line1.trim(),
          address_line2: form.address_line2.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim() || undefined,
          pincode: form.pincode.trim(),
          is_default: form.is_default,
        },
      })
    );

    if (updateAddress.fulfilled.match(result)) {
      router.back();
    } else {
      Alert.alert(t('common.error'), t('addresses.errors.saveFailed'));
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (!address) {
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
        <View style={styles.section}>
          <TextInput
            mode="outlined"
            label={t('addresses.label')}
            placeholder={t('addresses.labelPlaceholder')}
            value={form.label}
            onChangeText={(text) => updateField('label', text)}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label={`${t('addresses.fullName')} *`}
            placeholder={t('addresses.fullNamePlaceholder')}
            value={form.full_name}
            onChangeText={(text) => updateField('full_name', text)}
            error={!!errors.full_name}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.full_name}>
            {errors.full_name}
          </HelperText>

          <TextInput
            mode="outlined"
            label={`${t('addresses.phone')} *`}
            placeholder={t('addresses.phonePlaceholder')}
            value={form.phone}
            onChangeText={(text) => updateField('phone', text)}
            keyboardType="phone-pad"
            maxLength={14}
            error={!!errors.phone}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.phone}>
            {errors.phone}
          </HelperText>

          <TextInput
            mode="outlined"
            label={`${t('checkout.addressLine1')} *`}
            placeholder={t('addresses.addressLine1Placeholder')}
            value={form.address_line1}
            onChangeText={(text) => updateField('address_line1', text)}
            error={!!errors.address_line1}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.address_line1}>
            {errors.address_line1}
          </HelperText>

          <TextInput
            mode="outlined"
            label={t('checkout.addressLine2')}
            placeholder={t('addresses.addressLine2Placeholder')}
            value={form.address_line2}
            onChangeText={(text) => updateField('address_line2', text)}
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <TextInput
                mode="outlined"
                label={`${t('checkout.city')} *`}
                placeholder={t('addresses.cityPlaceholder')}
                value={form.city}
                onChangeText={(text) => updateField('city', text)}
                error={!!errors.city}
                style={styles.input}
              />
              <HelperText type="error" visible={!!errors.city}>
                {errors.city}
              </HelperText>
            </View>

            <View style={styles.halfField}>
              <TextInput
                mode="outlined"
                label={t('addresses.state')}
                placeholder={t('addresses.statePlaceholder')}
                value={form.state}
                onChangeText={(text) => updateField('state', text)}
                style={styles.input}
              />
            </View>
          </View>

          <TextInput
            mode="outlined"
            label={`${t('checkout.pincode')} *`}
            placeholder={t('addresses.pincodePlaceholder')}
            value={form.pincode}
            onChangeText={(text) => updateField('pincode', text)}
            keyboardType="number-pad"
            maxLength={6}
            error={!!errors.pincode}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.pincode}>
            {errors.pincode}
          </HelperText>

          <View style={styles.switchRow}>
            <Text variant="bodyLarge">{t('addresses.setAsDefault')}</Text>
            <Switch
              value={form.is_default}
              onValueChange={(value) => updateField('is_default', value)}
              color={theme.colors.primary}
            />
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={isLoading}
          disabled={isLoading}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          labelStyle={styles.saveButtonLabel}
        >
          {t('common.save')}
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
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  saveButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
});
