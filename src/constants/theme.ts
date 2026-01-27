import { Platform } from 'react-native';

// App color palette
export const colors = {
  primary: '#FF6B35',
  primaryLight: '#FFAB91',
  primaryDark: '#E55A2B',

  secondary: '#FFF5F2',

  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  error: '#E53935',
  errorLight: '#FFEBEE',
  info: '#2196F3',
  infoLight: '#E3F2FD',

  text: {
    primary: '#333333',
    secondary: '#666666',
    muted: '#999999',
    inverse: '#FFFFFF',
  },

  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    card: '#FFFFFF',
  },

  border: {
    light: '#EEEEEE',
    default: '#DDDDDD',
  },
} as const;

// Cross-platform shadow presets
export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
    android: { elevation: 3 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
    android: { elevation: 6 },
    default: {},
  }),
};

// Common spacing values
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// Border radius values
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// Font sizes
export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
} as const;
