import { StyleSheet, Pressable, View } from 'react-native';
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
  accessibilityLabel?: string;
  count?: number;
  countBgColor?: string;
  countTextColor?: string;
}

export function FioriChip({
  label,
  selected = false,
  onPress,
  showCheckmark = false,
  variant = 'brand',
  accessibilityLabel,
  count,
  countBgColor,
  countTextColor,
}: FioriChipProps) {
  const { appColors } = useAppTheme();

  const variantColors = {
    brand: appColors.brand,
    positive: appColors.positive,
    informative: appColors.informative,
  } as const;

  const selectedBg = variantColors[variant];
  const showCount = count !== undefined && count > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected }}
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
      {showCount && (
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: countBgColor ?? (selected ? appColors.text.inverse : appColors.neutralLight),
            },
          ]}
        >
          <Text
            style={[
              styles.countText,
              {
                color: countTextColor ?? (selected ? selectedBg : appColors.text.secondary),
              },
            ]}
          >
            {count}
          </Text>
        </View>
      )}
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
    gap: spacing.xs,
  },
  checkmark: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  countText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
  },
});
