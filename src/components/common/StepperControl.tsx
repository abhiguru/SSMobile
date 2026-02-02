import { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { spacing, borderRadius, fontFamily, fontSize } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface StepperControlProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function StepperControl({
  value,
  onValueChange,
  min = 1,
  max = 999,
  step = 1,
}: StepperControlProps) {
  const { appColors } = useAppTheme();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const atMin = value <= min;
  const atMax = value >= max;

  const handleDecrement = () => {
    if (atMin) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(Math.max(min, value - step));
  };

  const handleIncrement = () => {
    if (atMax) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(Math.min(max, value + step));
  };

  const handleStartEdit = () => {
    setEditText(String(value));
    setEditing(true);
  };

  const handleEndEdit = () => {
    setEditing(false);
    const parsed = parseInt(editText, 10);
    if (!isNaN(parsed)) {
      onValueChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleDecrement}
        style={[styles.button, { backgroundColor: appColors.shell }, atMin && styles.buttonDisabled]}
        disabled={atMin}
      >
        <MaterialCommunityIcons
          name="minus"
          size={18}
          color={atMin ? appColors.text.disabled : appColors.text.primary}
        />
      </Pressable>

      {editing ? (
        <TextInput
          value={editText}
          onChangeText={setEditText}
          onBlur={handleEndEdit}
          onSubmitEditing={handleEndEdit}
          keyboardType="number-pad"
          autoFocus
          style={[styles.valueInput, { color: appColors.text.primary, borderBottomColor: appColors.activeBorder }]}
          selectTextOnFocus
        />
      ) : (
        <Pressable onPress={handleStartEdit} style={styles.valueContainer}>
          <TextInput
            value={String(value)}
            editable={false}
            style={[styles.valueText, { color: appColors.text.primary }]}
            pointerEvents="none"
          />
        </Pressable>
      )}

      <Pressable
        onPress={handleIncrement}
        style={[styles.button, { backgroundColor: appColors.shell }, atMax && styles.buttonDisabled]}
        disabled={atMax}
      >
        <MaterialCommunityIcons
          name="plus"
          size={18}
          color={atMax ? appColors.text.disabled : appColors.text.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Stepper spec: 32pt × 32pt, borderRadius 8 (rounded square)
  button: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  valueContainer: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueInput: {
    minWidth: 60,
    textAlign: 'center',
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    borderBottomWidth: 2,
    paddingVertical: spacing.xs,
  },
  valueText: {
    textAlign: 'center',
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
});
