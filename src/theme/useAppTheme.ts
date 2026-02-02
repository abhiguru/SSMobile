import { useTheme } from 'react-native-paper';
import type { AppTheme } from './paperTheme';

export function useAppTheme() {
  return useTheme<AppTheme>();
}
