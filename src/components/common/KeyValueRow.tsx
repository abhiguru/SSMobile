import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing, fontFamily, fontSize } from '../../constants/theme';

interface KeyValueRowProps {
  label: string;
  value: string;
  onPress?: () => void;
}

export function KeyValueRow({ label, value, onPress }: KeyValueRowProps) {
  const valueColor = onPress ? colors.brand : colors.text.primary;

  const content = (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: fontSize.label,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    flex: 1,
  },
  value: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
    textAlign: 'right',
    flex: 2,
    marginLeft: spacing.md,
  },
});
