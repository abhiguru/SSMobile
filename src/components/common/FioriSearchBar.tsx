import { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Pressable, LayoutAnimation } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { spacing, fontFamily } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface FioriSearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export function FioriSearchBar({
  placeholder = 'Search',
  value,
  onChangeText,
  onFocus,
  onBlur,
  autoFocus,
}: FioriSearchBarProps) {
  const { appColors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleFocus = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setFocused(false);
    onBlur?.();
  };

  const handleCancel = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onChangeText('');
    inputRef.current?.blur();
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          { backgroundColor: appColors.fieldBackground },
          focused && { backgroundColor: appColors.surface, borderWidth: 2, borderColor: appColors.activeBorder },
        ]}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={appColors.text.secondary}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={appColors.text.secondary}
          autoFocus={autoFocus}
          style={[styles.input, { color: appColors.text.primary }]}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText('')} style={styles.clearButton}>
            <MaterialCommunityIcons name="close-circle" size={16} color={appColors.fieldBorder} />
          </Pressable>
        )}
      </View>
      {focused && (
        <Pressable onPress={handleCancel} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: appColors.activeBorder }]}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
  },
  cancelButton: {
    marginLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
  },
});
