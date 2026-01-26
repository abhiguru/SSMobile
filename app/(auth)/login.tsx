import { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { sendOtp, clearError } from '../../src/store/slices/authSlice';
import { PHONE_REGEX, PHONE_PREFIX } from '../../src/constants';
import type { AppTheme } from '../../src/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const theme = useTheme<AppTheme>();

  const [phone, setPhone] = useState('9876543210');
  const [validationError, setValidationError] = useState('');

  const handleSendOtp = async () => {
    setValidationError('');
    dispatch(clearError());

    if (!PHONE_REGEX.test(phone)) {
      setValidationError(t('auth.invalidPhone'));
      return;
    }

    const fullPhone = `${PHONE_PREFIX}${phone}`;
    const result = await dispatch(sendOtp(fullPhone));

    if (sendOtp.fulfilled.match(result)) {
      router.push('/(auth)/otp');
    }
  };

  const hasError = !!(validationError || error);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
            {t('home.title')}
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {t('auth.enterPhone')}
          </Text>

          <TextInput
            mode="outlined"
            label={t('auth.enterPhone')}
            placeholder="9876543210"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            disabled={isLoading}
            returnKeyType="done"
            onSubmitEditing={handleSendOtp}
            left={<TextInput.Affix text={PHONE_PREFIX} />}
            error={hasError}
            style={styles.input}
          />
          <HelperText type="error" visible={hasError}>
            {validationError || error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSendOtp}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {t('auth.sendOtp')}
          </Button>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
});
