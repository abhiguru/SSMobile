import { ScrollView, StyleSheet } from 'react-native';
import { FioriChip } from './FioriChip';
import { spacing } from '../../constants/theme';

interface FilterOption {
  key: string;
  label: string;
}

interface FilterFeedbackBarProps {
  options: FilterOption[];
  selected: string[];
  onToggle: (key: string) => void;
  showCheckmark?: boolean;
}

export function FilterFeedbackBar({
  options,
  selected,
  onToggle,
  showCheckmark = true,
}: FilterFeedbackBarProps) {
  // Sort active filters to the left
  const sorted = [...options].sort((a, b) => {
    const aSelected = selected.includes(a.key) ? 0 : 1;
    const bSelected = selected.includes(b.key) ? 0 : 1;
    return aSelected - bSelected;
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.bar}
    >
      {sorted.map((option) => (
        <FioriChip
          key={option.key}
          label={option.label}
          selected={selected.includes(option.key)}
          onPress={() => onToggle(option.key)}
          showCheckmark={showCheckmark}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 44,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
