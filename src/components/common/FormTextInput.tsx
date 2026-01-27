import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { TextInput, HelperText } from 'react-native-paper';
import type { TextInputProps } from 'react-native-paper';

interface FormTextInputProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText' | 'error'> {
  control: Control<T>;
  name: Path<T>;
}

export function FormTextInput<T extends FieldValues>({
  control,
  name,
  ...inputProps
}: FormTextInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <>
          <TextInput
            {...inputProps}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={!!error}
          />
          <HelperText type="error" visible={!!error}>
            {error?.message ?? ''}
          </HelperText>
        </>
      )}
    />
  );
}
