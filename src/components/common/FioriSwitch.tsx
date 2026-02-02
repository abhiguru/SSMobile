import { View, Switch, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { spacing, fontFamily, fontSize } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

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
  const { appColors } = useAppTheme();

  const handleChange = (newValue: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(newValue);
  };

  return (
    <View style={styles.cell}>
      <Text style={[styles.label, { color: appColors.text.primary }, disabled && { color: appColors.text.disabled }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={handleChange}
        disabled={disabled}
        trackColor={{ false: appColors.border, true: appColors.brand }}
        thumbColor={appColors.surface}
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
    marginRight: spacing.md,
  },
});
