import { Platform } from 'react-native';

// ─── SAP Fiori Horizon (Morning) Color System ───────────────────────────────
// Brand color: #FF6B35 (replaces SAP's default blue #0070F2)

export const colors = {
  // Brand
  brand: '#FF6B35',
  brandLight: '#FFAB91',
  brandDark: '#E55A2B',

  // Surfaces
  shell: '#F5F6F7',
  surface: '#FFFFFF',

  // Text
  text: {
    primary: '#1D2D3E',
    secondary: '#556B82',
    disabled: '#91C8F6',
    inverse: '#FFFFFF',
  },

  // Semantic (Fiori Horizon exact values)
  negative: '#D20A0A',
  negativeLight: '#FFEAF4',
  critical: '#C35500',
  criticalLight: '#FFF3B8',
  positive: '#188918',
  positiveLight: '#F5FAE5',
  informative: '#0070F2',
  informativeLight: '#D1EFFF',
  neutral: '#5B738B',
  neutralLight: '#E5E5E5',

  // Borders & Fields
  border: '#E5E5E5',
  fieldBorder: '#89919A',
  listBorder: '#E5E5E5',

  // Button (Fiori spec adapted with orange brand)
  button: {
    background: '#FFFFFF',
    border: '#FF6B35',
    text: '#FF6B35',
    emphasizedBg: '#FF6B35',
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
} as const;

// ─── Fiori Type Scale ───────────────────────────────────────────────────────
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
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
  brand: ['#FF6B35', '#FF8F65'] as readonly string[],
  warmHeader: ['#FF6B35', '#E55A2B'] as readonly string[],
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
