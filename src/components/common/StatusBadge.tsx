import { Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { colors, borderRadius, fontSize } from '../../constants/theme';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  placed: { bg: colors.warningLight, text: colors.warning },
  confirmed: { bg: colors.warningLight, text: colors.warning },
  out_for_delivery: { bg: colors.infoLight, text: colors.info },
  delivered: { bg: colors.successLight, text: colors.success },
  cancelled: { bg: colors.errorLight, text: colors.error },
  delivery_failed: { bg: colors.errorLight, text: colors.error },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.placed;

  return (
    <Chip
      compact
      style={[styles.chip, { backgroundColor: statusColors.bg }]}
      textStyle={[styles.text, { color: statusColors.text }]}
    >
      {t(`status.${status}`)}
    </Chip>
  );
}
const styles = StyleSheet.create({
  chip: {
    borderRadius: borderRadius.lg,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
