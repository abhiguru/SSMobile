import { StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { spacing, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

export function LoadingScreen() {
  const { appColors, colors: themeColors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <Animated.View style={[styles.logoContainer, { backgroundColor: appColors.shell }]}>
        <MaterialCommunityIcons name="store" size={32} color={themeColors.primary} />
      </Animated.View>
      <ActivityIndicator size="large" color={themeColors.primary} style={styles.spinner} />
      <Text variant="bodyMedium" style={[styles.loadingText, { color: appColors.text.secondary }]}>{t('common.loading')}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  spinner: {
    marginBottom: spacing.sm,
  },
  loadingText: {
    fontFamily: fontFamily.regular,
  },
});
