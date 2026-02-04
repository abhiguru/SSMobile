import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, HelperText } from 'react-native-paper';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useVerifyOtpMutation, useSendOtpMutation } from '../../src/store/apiSlice';
import { OTP_LENGTH, ERROR_CODES } from '../../src/constants';
import { spacing, fontFamily } from '../../src/constants/theme';
import { AppButton } from '../../src/components/common/AppButton';
import { hapticSuccess, hapticError } from '../../src/utils/haptics';
import { useAppTheme } from '../../src/theme/useAppTheme';

const OTP_RESEND_SECONDS = 60;

export default function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { phone: pendingPhone } = useLocalSearchParams<{ phone: string }>();
  const [verifyOtp, { isLoading: verifyLoading, error: verifyError, reset: resetVerify }] = useVerifyOtpMutation();
  const [sendOtp, { isLoading: resendLoading }] = useSendOtpMutation();
  const isLoading = verifyLoading || resendLoading;
  const error = verifyError && 'data' in verifyError ? (verifyError.data as string) : null;
  const { appColors } = useAppTheme();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(OTP_RESEND_SECONDS);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  // Shake animation for error
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Shake on error
  useEffect(() => {
    if (error) {
      hapticError();
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [error, shakeX]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste/autofill of multiple digits
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

  const handleVerify = useCallback(async () => {
    resetVerify();

    if (!pendingPhone) {
      router.replace('/(auth)/login');
      return;
    }

    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      return;
    }

    try {
      await verifyOtp({ phone: pendingPhone, otp: otpString }).unwrap();
      hapticSuccess();
      router.replace('/');
    } catch {
      // error is captured by the mutation hook
    }
  }, [verifyOtp, resetVerify, otp, pendingPhone, router]);

  // Auto-verify when all digits are filled
  useEffect(() => {
    if (otp.every((d) => d !== '') && !isLoading) {
      const timer = setTimeout(() => {
        handleVerify();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [otp, isLoading, handleVerify]);

  const handleResend = async () => {
    if (!pendingPhone || countdown > 0) return;

    resetVerify();
    setOtp(['', '', '', '', '', '']);
    setCountdown(OTP_RESEND_SECONDS);
    try {
      await sendOtp(pendingPhone).unwrap();
    } catch {
      // error handled by hook
    }
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
      style={[styles.container, { backgroundColor: appColors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text variant="headlineSmall" style={[styles.title, { color: appColors.text.primary }]}>
            {t('auth.enterOtp')}
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: appColors.text.secondary }]}>
            {t('auth.otpSent')} {pendingPhone}
          </Text>

          <Animated.View style={[styles.otpContainer, shakeStyle]}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref: any) => { inputRefs.current[index] = ref; }}
                mode="outlined"
                keyboardType="number-pad"
                textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                value={digit}
                onChangeText={(value) => handleOtpChange(value.replace(/\D/g, ''), index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                disabled={isLoading}
                style={[styles.otpInput, { backgroundColor: appColors.surface }, digit ? { backgroundColor: appColors.informativeLight } : undefined]}
                contentStyle={styles.otpInputContent}
                outlineStyle={digit ? { borderColor: appColors.brand, borderWidth: 2 } : undefined}
              />
            ))}
          </Animated.View>

          <HelperText type="error" visible={!!error} style={styles.errorText}>
            {getErrorMessage()}
          </HelperText>

          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={isLoading || otp.some((d) => !d)}
            onPress={handleVerify}
          >
            {t('auth.verifyOtp')}
          </AppButton>

          <View style={styles.resendRow}>
            <AppButton
              variant="text"
              size="sm"
              disabled={isLoading || countdown > 0}
              onPress={handleResend}
            >
              {t('auth.resendOtp')}
            </AppButton>
            {countdown > 0 && (
              <Text variant="bodySmall" style={{ color: appColors.neutral }}>
                {t('auth.resendIn', { seconds: countdown })}
              </Text>
            )}
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  otpInput: {
    width: 48,
    height: 56,
    textAlign: 'center',
  },
  otpInputContent: {
    fontSize: 24,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
