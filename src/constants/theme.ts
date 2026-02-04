import { Platform } from 'react-native';

// ─── SAP Fiori Horizon (Morning) Color System ───────────────────────────────
// Brand color: #f69000 (Fiori-compliant orange)

export const lightColors = {
  // Brand
  brand: '#f69000',
  brandLight: '#FFF0D9',
  brandDark: '#dd8200',

  // Surfaces
  shell: '#F5F6F7',
  surface: '#FFFFFF',
  pressedSurface: '#F5F6F7',
  fieldBackground: '#F2F2F7',

  // Text
  text: {
    primary: '#1D2D3E',
    secondary: '#556B82',
    disabled: '#91C8F6',
    inverse: '#FFFFFF',
  },

  // Semantic (Fiori Horizon exact values)
  negative: '#D32030',
  negativeLight: '#FFEAF4',
  critical: '#E9730C',
  criticalLight: '#FFF3B8',
  positive: '#36A41D',
  positiveLight: '#F5FAE5',
  informative: '#0057D2',
  informativeLight: '#D1EFFF',
  neutral: '#5B738B',
  neutralLight: '#E5E5E5',

  // Derived
  brandTint: '#FFF5F2',
  toastDefault: '#323232',
  badgeRed: '#D32030',
  activeBorder: '#0057D2',

  // Borders & Fields
  border: '#E5E5E5',
  fieldBorder: '#89919A',
  listBorder: '#E5E5E5',

  // Button (Fiori spec adapted with orange brand)
  button: {
    background: '#FFFFFF',
    border: '#f69000',
    text: '#f69000',
    emphasizedBg: '#f69000',
    emphasizedText: '#FFFFFF',
  },
} as const;

export const darkColors = {
  // Brand
  brand: '#f69000',
  brandLight: '#3D2800',
  brandDark: '#FFB347',

  // Surfaces
  shell: '#121212',
  surface: '#1E1E1E',
  pressedSurface: '#2C2C2C',
  fieldBackground: '#2C2C2C',

  // Text
  text: {
    primary: '#E8EAED',
    secondary: '#9AA0A6',
    disabled: '#5F6368',
    inverse: '#1D2D3E',
  },

  // Semantic (muted for dark backgrounds)
  negative: '#F28B82',
  negativeLight: '#3D1518',
  critical: '#FBBC04',
  criticalLight: '#3D3012',
  positive: '#81C995',
  positiveLight: '#1B3D20',
  informative: '#8AB4F8',
  informativeLight: '#1A2744',
  neutral: '#9AA0A6',
  neutralLight: '#3C4043',

  // Derived
  brandTint: '#2E1F0A',
  toastDefault: '#E8EAED',
  badgeRed: '#F28B82',
  activeBorder: '#8AB4F8',

  // Borders & Fields
  border: '#3C4043',
  fieldBorder: '#5F6368',
  listBorder: '#3C4043',

  // Button (Fiori spec adapted with orange brand)
  button: {
    background: '#2C2C2C',
    border: '#f69000',
    text: '#FFB347',
    emphasizedBg: '#f69000',
    emphasizedText: '#FFFFFF',
  },
} as const;

export interface AppColors {
  brand: string;
  brandLight: string;
  brandDark: string;
  shell: string;
  surface: string;
  pressedSurface: string;
  fieldBackground: string;
  text: { primary: string; secondary: string; disabled: string; inverse: string };
  negative: string;
  negativeLight: string;
  critical: string;
  criticalLight: string;
  positive: string;
  positiveLight: string;
  informative: string;
  informativeLight: string;
  neutral: string;
  neutralLight: string;
  brandTint: string;
  toastDefault: string;
  badgeRed: string;
  activeBorder: string;
  border: string;
  fieldBorder: string;
  listBorder: string;
  button: { background: string; border: string; text: string; emphasizedBg: string; emphasizedText: string };
}

// Backward compat — will be removed after full migration
export const colors = lightColors;

// ─── Fiori 8px Base Grid Spacing ────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ─── Fiori Border Radius ────────────────────────────────────────────────────
export const borderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  pill: 16,
  xl: 16,
} as const;

// ─── Fiori Type Scale ───────────────────────────────────────────────────────
export const fontSize = {
  xs: 12,
  label: 13,
  sm: 14,
  md: 16,
  body: 17,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 36,
} as const;

// ─── SAP 72 Font Family ────────────────────────────────────────────────────
export const fontFamily = {
  regular: '72-Regular',
  semiBold: '72-SemiBold',
  bold: '72-Bold',
} as const;

// ─── Fiori 5-Level Elevation System ────────────────────────────────────────
export const elevation = {
  level0: Platform.select({
    ios: {},
    android: { elevation: 0 },
    default: {},
  }),
  level1: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
    android: { elevation: 1 },
    default: {},
  }),
  level2: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 4 },
    android: { elevation: 3 },
    default: {},
  }),
  level3: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
    android: { elevation: 6 },
    default: {},
  }),
  level4: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
    android: { elevation: 10 },
    default: {},
  }),
};

// ─── Gradient Presets ───────────────────────────────────────────────────────
export const gradients = {
  brand: ['#f69000', '#FFB347'] as readonly string[],
  warmHeader: ['#f69000', '#dd8200'] as readonly string[],
};

export const darkGradients = {
  brand: ['#c27400', '#A66A00'] as readonly string[],
  warmHeader: ['#c27400', '#9B5E00'] as readonly string[],
};

export interface AppGradients {
  brand: readonly string[];
  warmHeader: readonly string[];
}

// ─── Animation Config ───────────────────────────────────────────────────────
export const animationConfig = {
  gentle: { damping: 20, stiffness: 150 },
  snappy: { damping: 15, stiffness: 300 },
} as const;

// ─── Card Style Constants ───────────────────────────────────────────────────
export const cardStyles = {
  standard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    ...elevation.level1,
  },
  elevated: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    ...elevation.level2,
  },
} as const;

// ─── Letter Spacing Tokens ──────────────────────────────────────────────────
export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;
