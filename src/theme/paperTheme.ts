import { MD3LightTheme } from 'react-native-paper';
import { fontFamily } from '../constants/theme';

export { colors, spacing, borderRadius, fontSize, elevation, fontFamily } from '../constants/theme';

export const paperTheme = {
  ...MD3LightTheme,
  fonts: {
    ...MD3LightTheme.fonts,
    default: { ...MD3LightTheme.fonts.default, fontFamily: fontFamily.regular },
    bodySmall: { ...MD3LightTheme.fonts.bodySmall, fontFamily: fontFamily.regular },
    bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontFamily: fontFamily.regular },
    bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontFamily: fontFamily.regular },
    labelSmall: { ...MD3LightTheme.fonts.labelSmall, fontFamily: fontFamily.semiBold },
    labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: fontFamily.semiBold },
    labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontFamily: fontFamily.semiBold },
    titleSmall: { ...MD3LightTheme.fonts.titleSmall, fontFamily: fontFamily.semiBold },
    titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: fontFamily.semiBold },
    titleLarge: { ...MD3LightTheme.fonts.titleLarge, fontFamily: fontFamily.semiBold },
    headlineSmall: { ...MD3LightTheme.fonts.headlineSmall, fontFamily: fontFamily.bold },
    headlineMedium: { ...MD3LightTheme.fonts.headlineMedium, fontFamily: fontFamily.bold },
    headlineLarge: { ...MD3LightTheme.fonts.headlineLarge, fontFamily: fontFamily.bold },
    displaySmall: { ...MD3LightTheme.fonts.displaySmall, fontFamily: fontFamily.bold },
    displayMedium: { ...MD3LightTheme.fonts.displayMedium, fontFamily: fontFamily.bold },
    displayLarge: { ...MD3LightTheme.fonts.displayLarge, fontFamily: fontFamily.bold },
  },
  colors: {
    ...MD3LightTheme.colors,
    primary: '#FF6B35',
    onPrimary: '#FFFFFF',
    primaryContainer: '#FFAB91',
    onPrimaryContainer: '#FF6B35',
    secondary: '#C35500',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFF3B8',
    onSecondaryContainer: '#C35500',
    error: '#D20A0A',
    onError: '#FFFFFF',
    errorContainer: '#FFEAF4',
    onErrorContainer: '#D20A0A',
    background: '#F5F6F7',
    onBackground: '#1D2D3E',
    surface: '#FFFFFF',
    onSurface: '#1D2D3E',
    surfaceVariant: '#F5F6F7',
    onSurfaceVariant: '#556B82',
    outline: '#89919A',
    outlineVariant: '#E5E5E5',
  },
  custom: {
    positive: '#188918',
    positiveContainer: '#F5FAE5',
    onPositive: '#FFFFFF',
    critical: '#C35500',
    criticalContainer: '#FFF3B8',
    informative: '#0070F2',
    informativeContainer: '#D1EFFF',
    disabledButton: '#FFAB91',
  },
};

export type AppTheme = typeof paperTheme;
