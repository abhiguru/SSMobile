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
import { Text, TextInput, HelperText } from 'react-native-paper';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useSendOtpMutation } from '../../src/store/apiSlice';
import { PHONE_REGEX, PHONE_PREFIX } from '../../src/constants';
import { spacing, borderRadius, elevation, fontFamily } from '../../src/constants/theme';
import { AppButton } from '../../src/components/common/AppButton';
import { useAppTheme } from '../../src/theme/useAppTheme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [sendOtp, { isLoading, error, reset }] = useSendOtpMutation();
  const { appColors, appGradients } = useAppTheme();

  const [phone, setPhone] = useState('9876543210');
  const [validationError, setValidationError] = useState('');

  const apiError = error && 'data' in error ? (error.data as string) : '';

  const handleSendOtp = async () => {
    setValidationError('');
    reset();

    if (!PHONE_REGEX.test(phone)) {
      setValidationError(t('auth.invalidPhone'));
      return;
    }

    const fullPhone = `${PHONE_PREFIX}${phone}`;
    try {
      await sendOtp(fullPhone).unwrap();
      router.push({ pathname: '/(auth)/otp', params: { phone: fullPhone } });
    } catch {
      // error is captured by the mutation hook
    }
  };

  const hasError = !!(validationError || apiError);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: appColors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.wrapper}>
          <LinearGradient
            colors={appGradients.brand as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
            </View>
            <Text variant="headlineLarge" style={[styles.heroTitle, { color: appColors.text.inverse }]}>
              {t('home.title')}
            </Text>
            <Text variant="bodyLarge" style={styles.heroTagline}>
              {t('auth.tagline')}
            </Text>
          </LinearGradient>

          <View style={[styles.formCard, { backgroundColor: appColors.surface }]}>
            <Text variant="titleLarge" style={[styles.formTitle, { color: appColors.text.primary }]}>
              {t('auth.enterPhone')}
            </Text>

            <TextInput
              mode="outlined"
              label={t('auth.phoneNumber')}
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
              style={[styles.input, { backgroundColor: appColors.surface }]}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={hasError}>
              {validationError || apiError}
            </HelperText>

            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              onPress={handleSendOtp}
            >
              {t('auth.sendOtp')}
            </AppButton>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
  },
  heroGradient: {
    paddingTop: 80,
    paddingBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...elevation.level3,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroTitle: {
    fontFamily: fontFamily.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroTagline: {
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  formCard: {
    flex: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: -24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  formTitle: {
    fontFamily: fontFamily.semiBold,
    marginBottom: spacing.xl,
  },
  input: {},
  inputOutline: {
    borderRadius: borderRadius.md,
  },
});
