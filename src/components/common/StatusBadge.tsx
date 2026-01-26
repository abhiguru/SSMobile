import { Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  placed: { bg: '#FFF3E0', text: '#FF9800' },
  confirmed: { bg: '#FFF3E0', text: '#FF9800' },
  out_for_delivery: { bg: '#E3F2FD', text: '#2196F3' },
  delivered: { bg: '#E8F5E9', text: '#4CAF50' },
  cancelled: { bg: '#FFEBEE', text: '#E53935' },
  delivery_failed: { bg: '#FFEBEE', text: '#E53935' },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const colors = STATUS_COLORS[status] || STATUS_COLORS.placed;

  return (
    <Chip
      compact
      style={[styles.chip, { backgroundColor: colors.bg }]}
      textStyle={[styles.text, { color: colors.text }]}
    >
      {t(`status.${status}`)}
    </Chip>
  );
}
const styles = StyleSheet.create({
  chip: {
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
