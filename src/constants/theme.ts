import { Platform } from 'react-native';

// ─── SAP Fiori Horizon (Morning) Color System ───────────────────────────────
// Brand color: #f69000 (Fiori-compliant orange)

export const colors = {
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

// ─── Animation Config ───────────────────────────────────────────────────────
export const animationConfig = {
  gentle: { damping: 20, stiffness: 150 },
  snappy: { damping: 15, stiffness: 300 },
} as const;

// ─── Letter Spacing Tokens ──────────────────────────────────────────────────
export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;
