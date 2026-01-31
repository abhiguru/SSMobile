import { StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, fontFamily } from '../../constants/theme';

interface FioriChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  showCheckmark?: boolean;
  variant?: 'brand' | 'positive' | 'informative';
}

const variantColors = {
  brand: colors.brand,
  positive: colors.positive,
  informative: colors.informative,
} as const;

export function FioriChip({
  label,
  selected = false,
  onPress,
  showCheckmark = false,
  variant = 'brand',
}: FioriChipProps) {
  const selectedBg = variantColors[variant];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: pressed ? colors.brandDark : selectedBg }
          : { backgroundColor: pressed ? colors.neutralLight : colors.fieldBackground },
      ]}
    >
      {selected && showCheckmark && (
        <MaterialCommunityIcons
          name="check"
          size={14}
          color={colors.text.inverse}
          style={styles.checkmark}
        />
      )}
      <Text
        style={[
          styles.label,
          selected ? styles.labelSelected : styles.labelUnselected,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 32,
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
  },
  checkmark: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
  },
  labelSelected: {
    color: colors.text.inverse,
  },
  labelUnselected: {
    color: colors.text.primary,
  },
});
