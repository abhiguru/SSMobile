import { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { verifyOtp, sendOtp, clearError } from '../../src/store/slices/authSlice';
import { OTP_LENGTH, ERROR_CODES } from '../../src/constants';
import type { AppTheme } from '../../src/theme';

export default function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error, pendingPhone } = useAppSelector((state) => state.auth);
  const theme = useTheme<AppTheme>();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const otpArray = value.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      otpArray.forEach((char, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + otpArray.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    dispatch(clearError());

    if (!pendingPhone) {
      router.replace('/(auth)/login');
      return;
    }

    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      return;
    }

    const result = await dispatch(verifyOtp({ phone: pendingPhone, otp: otpString }));

    if (verifyOtp.fulfilled.match(result)) {
      router.replace('/');
    }
  };

  const handleResend = async () => {
    if (!pendingPhone) return;

    dispatch(clearError());
    setOtp(['', '', '', '', '', '']);
    await dispatch(sendOtp(pendingPhone));
    inputRefs.current[0]?.focus();
  };

  const getErrorMessage = () => {
    if (!error) return null;
    if (error in ERROR_CODES) {
      return t(`auth.${error === 'AUTH_002' ? 'otpExpired' : 'wrongOtp'}`);
    }
    return error;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>
          {t('auth.enterOtp')}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('auth.otpSent')} {pendingPhone}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref: any) => { inputRefs.current[index] = ref; }}
              mode="outlined"
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              disabled={isLoading}
              style={styles.otpInput}
              contentStyle={styles.otpInputContent}
              outlineStyle={digit ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined}
            />
          ))}
        </View>

        <HelperText type="error" visible={!!error} style={styles.errorText}>
          {getErrorMessage()}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleVerify}
          loading={isLoading}
          disabled={isLoading || otp.some((d) => !d)}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          {t('auth.verifyOtp')}
        </Button>

        <Button
          mode="text"
          onPress={handleResend}
          disabled={isLoading}
          style={styles.resendButton}
        >
          {t('auth.resendOtp')}
        </Button>
      </View>
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
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  otpInputContent: {
    fontSize: 24,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 8,
  },
});
