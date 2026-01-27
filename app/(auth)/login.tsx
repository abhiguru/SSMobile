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
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../../src/store';
import { sendOtp, clearError } from '../../src/store/slices/authSlice';
import { PHONE_REGEX, PHONE_PREFIX } from '../../src/constants';
import { colors, spacing, borderRadius, gradients, elevation, fontFamily } from '../../src/constants/theme';
import { AppButton } from '../../src/components/common/AppButton';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

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
        <View style={styles.wrapper}>
          <LinearGradient
            colors={gradients.brand as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="store" size={48} color={colors.brand} />
            </View>
            <Text variant="headlineLarge" style={styles.heroTitle}>
              {t('home.title')}
            </Text>
            <Text variant="bodyLarge" style={styles.heroTagline}>
              {t('auth.tagline')}
            </Text>
          </LinearGradient>

          <View style={styles.formCard}>
            <Text variant="titleLarge" style={styles.formTitle}>
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
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <HelperText type="error" visible={hasError}>
              {validationError || error}
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
    backgroundColor: colors.surface,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...elevation.level3,
  },
  heroTitle: {
    fontFamily: fontFamily.bold,
    color: colors.text.inverse,
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: -24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  formTitle: {
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.surface,
  },
  inputOutline: {
    borderRadius: borderRadius.md,
  },
});
