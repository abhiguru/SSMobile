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
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../src/store';
import { updateAddress, selectAddresses } from '../../../src/store/slices/addressesSlice';
import { selectAppSettings, isPincodeServiceable } from '../../../src/store/slices/settingsSlice';
import { PHONE_REGEX } from '../../../src/constants';

export default function EditAddressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
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
        <View style={styles.section}>
          <Text style={styles.label}>{t('addresses.label')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('addresses.labelPlaceholder')}
            value={form.label}
            onChangeText={(text) => updateField('label', text)}
          />

          <Text style={styles.label}>
            {t('addresses.fullName')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.full_name && styles.inputError]}
            placeholder={t('addresses.fullNamePlaceholder')}
            value={form.full_name}
            onChangeText={(text) => updateField('full_name', text)}
          />
          {errors.full_name && <Text style={styles.errorText}>{errors.full_name}</Text>}

          <Text style={styles.label}>
            {t('addresses.phone')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            placeholder={t('addresses.phonePlaceholder')}
            value={form.phone}
            onChangeText={(text) => updateField('phone', text)}
            keyboardType="phone-pad"
            maxLength={14}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <Text style={styles.label}>
            {t('checkout.addressLine1')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.address_line1 && styles.inputError]}
            placeholder={t('addresses.addressLine1Placeholder')}
            value={form.address_line1}
            onChangeText={(text) => updateField('address_line1', text)}
          />
          {errors.address_line1 && <Text style={styles.errorText}>{errors.address_line1}</Text>}

          <Text style={styles.label}>{t('checkout.addressLine2')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('addresses.addressLine2Placeholder')}
            value={form.address_line2}
            onChangeText={(text) => updateField('address_line2', text)}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>
                {t('checkout.city')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                placeholder={t('addresses.cityPlaceholder')}
                value={form.city}
                onChangeText={(text) => updateField('city', text)}
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>

            <View style={styles.halfField}>
              <Text style={styles.label}>{t('addresses.state')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('addresses.statePlaceholder')}
                value={form.state}
                onChangeText={(text) => updateField('state', text)}
              />
            </View>
          </View>

          <Text style={styles.label}>
            {t('checkout.pincode')} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.pincode && styles.inputError]}
            placeholder={t('addresses.pincodePlaceholder')}
            value={form.pincode}
            onChangeText={(text) => updateField('pincode', text)}
            keyboardType="number-pad"
            maxLength={6}
          />
          {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('addresses.setAsDefault')}</Text>
            <Switch
              value={form.is_default}
              onValueChange={(value) => updateField('is_default', value)}
              trackColor={{ false: '#DDDDDD', true: '#FFAB91' }}
              thumbColor={form.is_default ? '#FF6B35' : '#FFFFFF'}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? t('common.loading') : t('common.save')}
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  required: {
    color: '#E53935',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#E53935',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#E53935',
    marginBottom: 12,
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
  switchLabel: {
    fontSize: 16,
    color: '#333333',
  },
  saveButton: {
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
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
