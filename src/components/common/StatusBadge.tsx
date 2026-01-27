import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius, fontFamily } from '../../constants/theme';

const STATUS_CONFIG: Record<string, {
  bg: string;
  text: string;
}> = {
  placed: { bg: colors.criticalLight, text: colors.critical },
  confirmed: { bg: colors.informativeLight, text: colors.informative },
  out_for_delivery: { bg: colors.informativeLight, text: colors.informative },
  delivered: { bg: colors.positiveLight, text: colors.positive },
  cancelled: { bg: colors.negativeLight, text: colors.negative },
  delivery_failed: { bg: colors.negativeLight, text: colors.negative },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.placed;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>
        {t(`status.${status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
  },
});
