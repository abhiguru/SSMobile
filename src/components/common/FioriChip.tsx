import { StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { spacing, borderRadius, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface FioriChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  showCheckmark?: boolean;
  variant?: 'brand' | 'positive' | 'informative';
}

export function FioriChip({
  label,
  selected = false,
  onPress,
  showCheckmark = false,
  variant = 'brand',
}: FioriChipProps) {
  const { appColors } = useAppTheme();

  const variantColors = {
    brand: appColors.brand,
    positive: appColors.positive,
    informative: appColors.informative,
  } as const;

  const selectedBg = variantColors[variant];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: pressed ? appColors.brandDark : selectedBg }
          : { backgroundColor: pressed ? appColors.neutralLight : appColors.fieldBackground },
      ]}
    >
      {selected && showCheckmark && (
        <MaterialCommunityIcons
          name="check"
          size={14}
          color={appColors.text.inverse}
          style={styles.checkmark}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: selected ? appColors.text.inverse : appColors.text.primary },
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
});
