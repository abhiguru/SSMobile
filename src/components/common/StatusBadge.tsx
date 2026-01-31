import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fontFamily } from '../../constants/theme';

// Fiori tag-spec colors (spec 18): darker text for readability in small containers
const STATUS_CONFIG: Record<string, {
  bg: string;
  text: string;
}> = {
  placed: { bg: '#FEF7F1', text: '#AA5808' },
  confirmed: { bg: '#EBF8FF', text: '#0040B0' },
  out_for_delivery: { bg: '#EBF8FF', text: '#0040B0' },
  delivered: { bg: '#F5FAE5', text: '#256F14' },
  cancelled: { bg: '#FFF4F2', text: '#AA161F' },
  delivery_failed: { bg: '#FFF4F2', text: '#AA161F' },
};

type BadgeSize = 'compact' | 'default';
type BadgeVariant = 'filled' | 'outlined';

interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
  variant?: BadgeVariant;
}

export function StatusBadge({ status, size = 'default', variant = 'filled' }: StatusBadgeProps) {
  const { t } = useTranslation();
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
