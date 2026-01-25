// App color palette
export const colors = {
  primary: '#FF6B35',
  primaryLight: '#FFAB91',
  primaryDark: '#E55A2B',

  secondary: '#FFF5F2',

  success: '#4CAF50',
  successLight: '#A5D6A7',
  warning: '#FF9800',
  error: '#E53935',
  info: '#2196F3',

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
