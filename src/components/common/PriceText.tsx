import { Text } from 'react-native-paper';
import { formatPrice } from '../../constants';
import { fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface PriceTextProps {
  paise: number;
  variant?: React.ComponentProps<typeof Text>['variant'];
}

export function PriceText({ paise, variant = 'titleMedium' }: PriceTextProps) {
  const { colors: themeColors } = useAppTheme();
  return (
    <Text variant={variant} style={{ color: themeColors.primary, fontFamily: fontFamily.bold }}>
      {formatPrice(paise)}
    </Text>
  );
}
