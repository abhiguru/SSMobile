import { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { spacing, borderRadius, fontFamily, fontSize } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

type ValidationState = 'error' | 'warning' | 'success' | undefined;

interface FormTextInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  helperText?: string;
  validationState?: ValidationState;
  validationMessage?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  /** @deprecated Accepted for backward compat but ignored */
  mode?: string;
}

const VALIDATION_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  error: 'alert-circle',
  warning: 'alert',
  success: 'check-circle',
};

export function FormTextInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  helperText,
  validationState: externalValidationState,
  validationMessage,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  numberOfLines,
  editable = true,
  maxLength,
  style: _containerStyle,
  mode: _mode,
}: FormTextInputProps<T>) {
  const [focused, setFocused] = useState(false);
  const { appColors } = useAppTheme();

  const VALIDATION_COLORS: Record<string, string> = {
    error: appColors.negative,
    warning: appColors.critical,
    success: appColors.positive,
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
        const vState = error ? 'error' : externalValidationState;
        const message = error?.message || validationMessage;
        const borderColor = vState
          ? VALIDATION_COLORS[vState]
          : focused
          ? appColors.activeBorder
          : appColors.fieldBorder;
        const borderWidth = focused || vState ? 2 : 1;

        return (
          <View style={styles.wrapper}>
            {label && (
              <Text style={[styles.label, { color: appColors.text.secondary }]}>{label}</Text>
            )}
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor,
                  borderWidth,
                  backgroundColor: focused ? appColors.surface : appColors.fieldBackground,
                },
              ]}
            >
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={() => { onBlur(); setFocused(false); }}
                onFocus={() => setFocused(true)}
                placeholder={placeholder}
                placeholderTextColor={appColors.text.secondary}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                multiline={multiline}
                numberOfLines={numberOfLines}
                editable={editable}
                maxLength={maxLength}
                style={[
                  styles.input,
                  { color: appColors.text.primary },
                  multiline && { textAlignVertical: 'top' as const },
                ]}
              />
              {value && value.length > 0 && editable && (
                <Pressable onPress={() => onChange('')} style={styles.clearButton}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={appColors.fieldBorder} />
                </Pressable>
              )}
              {vState && (
                <MaterialCommunityIcons
                  name={VALIDATION_ICONS[vState]}
                  size={16}
                  color={VALIDATION_COLORS[vState]}
                  style={styles.validationIcon}
                />
              )}
            </View>
            {message ? (
              <Text style={[styles.helperText, { color: VALIDATION_COLORS[vState || 'error'] }]}>
                {message}
              </Text>
            ) : helperText ? (
              <Text style={[styles.helperText, { color: appColors.text.secondary }]}>{helperText}</Text>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    paddingVertical: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
  },
  validationIcon: {
    marginLeft: spacing.xs,
  },
  helperText: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.regular,
    marginTop: spacing.xs,
  },
});
