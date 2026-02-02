import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, fontFamily, fontSize } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface KeyValueRowProps {
  label: string;
  value: string;
  onPress?: () => void;
}

export function KeyValueRow({ label, value, onPress }: KeyValueRowProps) {
  const { appColors } = useAppTheme();
  const valueColor = onPress ? appColors.brand : appColors.text.primary;

  const content = (
    <View style={styles.container}>
      <Text style={[styles.label, { color: appColors.text.secondary }]}>{label}</Text>
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
    flex: 1,
  },
  value: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    textAlign: 'right',
    flex: 2,
    marginLeft: spacing.md,
  },
});
