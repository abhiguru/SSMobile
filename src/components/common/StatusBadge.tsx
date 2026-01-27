import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily } from '../../constants/theme';

const STATUS_CONFIG: Record<string, {
  bg: string;
  text: string;
}> = {
  placed: { bg: '#FFF3B8', text: '#C35500' },
  confirmed: { bg: '#D1EFFF', text: '#0070F2' },
  out_for_delivery: { bg: '#D1EFFF', text: '#0070F2' },
  delivered: { bg: '#F5FAE5', text: '#188918' },
  cancelled: { bg: '#FFEAF4', text: '#D20A0A' },
  delivery_failed: { bg: '#FFEAF4', text: '#D20A0A' },
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
  },
});
