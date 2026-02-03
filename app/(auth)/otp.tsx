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
  withSpring,
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

  // Digit scale animations (explicit calls to avoid hooks-in-loop)
  const d0 = useSharedValue(1);
  const d1 = useSharedValue(1);
  const d2 = useSharedValue(1);
  const d3 = useSharedValue(1);
  const d4 = useSharedValue(1);
  const d5 = useSharedValue(1);
  const digitScales = [d0, d1, d2, d3, d4, d5];
  const da0 = useAnimatedStyle(() => ({ transform: [{ scale: d0.value }] }));
  const da1 = useAnimatedStyle(() => ({ transform: [{ scale: d1.value }] }));
  const da2 = useAnimatedStyle(() => ({ transform: [{ scale: d2.value }] }));
  const da3 = useAnimatedStyle(() => ({ transform: [{ scale: d3.value }] }));
  const da4 = useAnimatedStyle(() => ({ transform: [{ scale: d4.value }] }));
  const da5 = useAnimatedStyle(() => ({ transform: [{ scale: d5.value }] }));
  const digitAnimStyles = [da0, da1, da2, da3, da4, da5];

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

    // Scale pulse on digit entry
    if (value) {
      digitScales[index].value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 300 })
      );
    }

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
              <Animated.View key={index} style={digitAnimStyles[index]}>
                <TextInput
                  ref={(ref: any) => { inputRefs.current[index] = ref; }}
                  mode="outlined"
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  disabled={isLoading}
                  style={[styles.otpInput, { backgroundColor: appColors.surface }, digit ? { backgroundColor: appColors.informativeLight } : undefined]}
                  contentStyle={styles.otpInputContent}
                  outlineStyle={digit ? { borderColor: appColors.brand, borderWidth: 2 } : undefined}
                />
              </Animated.View>
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
