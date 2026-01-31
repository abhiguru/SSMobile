import { View, Switch, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontFamily, fontSize } from '../../constants/theme';

interface FioriSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function FioriSwitch({
  label,
  value,
  onValueChange,
  disabled = false,
}: FioriSwitchProps) {
  const handleChange = (newValue: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(newValue);
  };

  return (
    <View style={styles.cell}>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={handleChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.brand }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
    marginRight: spacing.md,
  },
  labelDisabled: {
    color: colors.text.disabled,
  },
});
