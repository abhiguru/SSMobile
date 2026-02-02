import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

type BadgeSize = 'compact' | 'default';
type BadgeVariant = 'filled' | 'outlined';

interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
  variant?: BadgeVariant;
}

export function StatusBadge({ status, size = 'default', variant = 'filled' }: StatusBadgeProps) {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();

  const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
    placed: { bg: appColors.criticalLight, text: appColors.critical },
    confirmed: { bg: appColors.informativeLight, text: appColors.informative },
    out_for_delivery: { bg: appColors.informativeLight, text: appColors.informative },
    delivered: { bg: appColors.positiveLight, text: appColors.positive },
    cancelled: { bg: appColors.negativeLight, text: appColors.negative },
    delivery_failed: { bg: appColors.negativeLight, text: appColors.negative },
  };
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.placed;

  const isCompact = size === 'compact';
  const isOutlined = variant === 'outlined';

  return (
    <View
      style={[
        styles.badge,
        {
          height: isCompact ? 20 : 24,
          borderRadius: isCompact ? 10 : 12,
          backgroundColor: isOutlined ? 'transparent' : config.bg,
          borderWidth: isOutlined ? 1 : 0,
          borderColor: isOutlined ? config.text : 'transparent',
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: isCompact ? 10 : 12,
          },
        ]}
      >
        {t(`status.${status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontFamily: fontFamily.semiBold,
  },
});
