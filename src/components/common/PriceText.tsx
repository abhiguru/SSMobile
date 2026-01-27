import { Text, useTheme } from 'react-native-paper';
import { formatPrice } from '../../constants';
import { fontFamily } from '../../constants/theme';
import type { AppTheme } from '../../theme';

interface PriceTextProps {
  paise: number;
  variant?: React.ComponentProps<typeof Text>['variant'];
}

export function PriceText({ paise, variant = 'titleMedium' }: PriceTextProps) {
  const theme = useTheme<AppTheme>();
  return (
    <Text variant={variant} style={{ color: theme.colors.primary, fontWeight: 'bold', fontFamily: fontFamily.bold }}>
      {formatPrice(paise)}
    </Text>
  );
}
