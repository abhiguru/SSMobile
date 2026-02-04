import { useState, useRef, useCallback } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { spacing, borderRadius, fontFamily, fontSize } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

// #10: Long-press repeat configuration
const LONG_PRESS_DELAY = 400; // Initial delay before rapid increment starts
const RAPID_INCREMENT_INTERVAL = 100; // Interval between increments during long-press

interface StepperControlProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  accessibilityLabel?: string;
}

export function StepperControl({
  value,
  onValueChange,
  min = 1,
  max = 999,
  step = 1,
  accessibilityLabel,
}: StepperControlProps) {
  const { appColors } = useAppTheme();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

  // #10: Long-press interval refs
  const decrementIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incrementIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track latest value for interval callbacks
  const valueRef = useRef(value);
  valueRef.current = value;

  const atMin = value <= min;
  const atMax = value >= max;

  const handleDecrement = useCallback(() => {
    if (value <= min) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(Math.max(min, value - step));
  }, [value, min, step, onValueChange]);

  const handleIncrement = useCallback(() => {
    if (value >= max) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(Math.min(max, value + step));
  }, [value, max, step, onValueChange]);

  // #10: Long-press handlers for rapid increment/decrement
  const handleDecrementLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    decrementIntervalRef.current = setInterval(() => {
      const newValue = Math.max(min, valueRef.current - step);
      if (newValue !== valueRef.current) {
        onValueChange(newValue);
        Haptics.selectionAsync();
      }
    }, RAPID_INCREMENT_INTERVAL);
  }, [min, step, onValueChange]);

  const handleIncrementLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    incrementIntervalRef.current = setInterval(() => {
      const newValue = Math.min(max, valueRef.current + step);
      if (newValue !== valueRef.current) {
        onValueChange(newValue);
        Haptics.selectionAsync();
      }
    }, RAPID_INCREMENT_INTERVAL);
  }, [max, step, onValueChange]);

  const stopDecrement = useCallback(() => {
    if (decrementIntervalRef.current) {
      clearInterval(decrementIntervalRef.current);
      decrementIntervalRef.current = null;
    }
  }, []);

  const stopIncrement = useCallback(() => {
    if (incrementIntervalRef.current) {
      clearInterval(incrementIntervalRef.current);
      incrementIntervalRef.current = null;
    }
  }, []);

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
    <View
      style={[styles.container, { borderColor: appColors.border }]}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
    >
      {/* #10: Increased touch target to 44x44 (Apple HIG minimum) with long-press support */}
      <Pressable
        onPress={handleDecrement}
        onLongPress={handleDecrementLongPress}
        onPressOut={stopDecrement}
        delayLongPress={LONG_PRESS_DELAY}
        style={[styles.button, { backgroundColor: appColors.shell }, atMin && styles.buttonDisabled]}
        disabled={atMin}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        accessibilityState={{ disabled: atMin }}
      >
        <MaterialCommunityIcons
          name="minus"
          size={20}
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
        <Pressable onPress={handleStartEdit} style={[styles.valueContainer, { borderColor: appColors.border }]}>
          <TextInput
            value={String(value)}
            editable={false}
            style={[styles.valueText, { color: appColors.text.primary }]}
            pointerEvents="none"
          />
        </Pressable>
      )}

      {/* #10: Increased touch target to 44x44 (Apple HIG minimum) with long-press support */}
      <Pressable
        onPress={handleIncrement}
        onLongPress={handleIncrementLongPress}
        onPressOut={stopIncrement}
        delayLongPress={LONG_PRESS_DELAY}
        style={[styles.button, { backgroundColor: appColors.shell }, atMax && styles.buttonDisabled]}
        disabled={atMax}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        accessibilityState={{ disabled: atMax }}
      >
        <MaterialCommunityIcons
          name="plus"
          size={20}
          color={atMax ? appColors.text.disabled : appColors.text.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fiori Stepper: container with 1px border (color applied inline for theme support)
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  // #10: Keep 44x44 (Apple HIG minimum touch target)
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  // Fiori: vertical separator between buttons and value (color applied inline for theme support)
  valueContainer: {
    minWidth: 60,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
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
