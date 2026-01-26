import { MD3LightTheme } from 'react-native-paper';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#FF6B35',
    onPrimary: '#FFFFFF',
    primaryContainer: '#FFF5F2',
    onPrimaryContainer: '#FF6B35',
    secondary: '#FF9800',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFF3E0',
    onSecondaryContainer: '#FF9800',
    error: '#E53935',
    onError: '#FFFFFF',
    errorContainer: '#FFEBEE',
    onErrorContainer: '#E53935',
    background: '#F5F5F5',
    onBackground: '#333333',
    surface: '#FFFFFF',
    onSurface: '#333333',
    surfaceVariant: '#F5F5F5',
    onSurfaceVariant: '#666666',
    outline: '#DDDDDD',
    outlineVariant: '#EEEEEE',
  },
  custom: {
    success: '#4CAF50',
    successContainer: '#E8F5E9',
    onSuccess: '#FFFFFF',
    warning: '#FF9800',
    warningContainer: '#FFF3E0',
    info: '#2196F3',
    infoContainer: '#E3F2FD',
    disabledButton: '#FFAB91',
  },
};

export type AppTheme = typeof paperTheme;
