import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { lightColors, darkColors, fontFamily, gradients, darkGradients } from '../constants/theme';
import type { AppColors, AppGradients } from '../constants/theme';

export { colors, lightColors, darkColors, spacing, borderRadius, fontSize, elevation, fontFamily } from '../constants/theme';

// Shared font config
const appFonts = {
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
} as const;

function buildCustom(c: AppColors) {
  return {
    positive: c.positive,
    positiveContainer: c.positiveLight,
    onPositive: '#FFFFFF',
    critical: c.critical,
    criticalContainer: c.criticalLight,
    informative: c.informative,
    informativeContainer: c.informativeLight,
    disabledButton: c.brandLight,
  };
}

export const lightPaperTheme: typeof MD3LightTheme & {
  custom: ReturnType<typeof buildCustom>;
  appColors: AppColors;
  appGradients: AppGradients;
} = {
  ...MD3LightTheme,
  fonts: { ...MD3LightTheme.fonts, ...appFonts },
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.brand,
    onPrimary: '#FFFFFF',
    primaryContainer: lightColors.brandLight,
    onPrimaryContainer: lightColors.brand,
    secondary: lightColors.critical,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFF3B8',
    onSecondaryContainer: lightColors.critical,
    error: lightColors.negative,
    onError: '#FFFFFF',
    errorContainer: '#FFEAF4',
    onErrorContainer: lightColors.negative,
    background: lightColors.shell,
    onBackground: lightColors.text.primary,
    surface: lightColors.surface,
    onSurface: lightColors.text.primary,
    surfaceVariant: lightColors.shell,
    onSurfaceVariant: lightColors.text.secondary,
    outline: lightColors.fieldBorder,
    outlineVariant: lightColors.border,
  },
  custom: buildCustom(lightColors),
  appColors: lightColors,
  appGradients: gradients,
};

export const darkPaperTheme: typeof MD3DarkTheme & {
  custom: ReturnType<typeof buildCustom>;
  appColors: AppColors;
  appGradients: AppGradients;
} = {
  ...MD3DarkTheme,
  fonts: { ...MD3DarkTheme.fonts, ...appFonts },
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.brand,
    onPrimary: '#FFFFFF',
    primaryContainer: darkColors.brandLight,
    onPrimaryContainer: darkColors.brandDark,
    secondary: darkColors.critical,
    onSecondary: '#1E1E1E',
    secondaryContainer: darkColors.criticalLight,
    onSecondaryContainer: darkColors.critical,
    error: darkColors.negative,
    onError: '#1E1E1E',
    errorContainer: darkColors.negativeLight,
    onErrorContainer: darkColors.negative,
    background: darkColors.shell,
    onBackground: darkColors.text.primary,
    surface: darkColors.surface,
    onSurface: darkColors.text.primary,
    surfaceVariant: darkColors.pressedSurface,
    onSurfaceVariant: darkColors.text.secondary,
    outline: darkColors.fieldBorder,
    outlineVariant: darkColors.border,
  },
  custom: buildCustom(darkColors),
  appColors: darkColors,
  appGradients: darkGradients,
};

export type AppTheme = typeof lightPaperTheme | typeof darkPaperTheme;
