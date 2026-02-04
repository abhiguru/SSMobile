import { View, Switch, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { spacing, fontFamily, fontSize } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface FioriSwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function FioriSwitch({
  label,
  description,
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
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: appColors.text.primary }, disabled && { color: appColors.text.disabled }]}>{label}</Text>
        {description && (
          <Text style={[styles.description, { color: appColors.text.secondary }]}>{description}</Text>
        )}
      </View>
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
    paddingVertical: spacing.sm,
  },
  labelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
});
