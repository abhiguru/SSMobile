import { StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, fontFamily } from '../../constants/theme';
import type { AppTheme } from '../../theme';

export function LoadingScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <Animated.View style={styles.logoContainer}>
        <MaterialCommunityIcons name="store" size={32} color={theme.colors.primary} />
      </Animated.View>
      <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
      <Text variant="bodyMedium" style={styles.loadingText}>{t('common.loading')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.shell,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  spinner: {
    marginBottom: spacing.sm,
  },
  loadingText: {
    color: colors.text.secondary,
    fontFamily: fontFamily.regular,
  },
});
