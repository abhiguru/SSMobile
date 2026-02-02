import { useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { spacing, borderRadius, fontFamily, elevation } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

interface SegmentOption {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function SegmentedControl({
  options,
  selectedKey,
  onSelect,
}: SegmentedControlProps) {
  const { appColors } = useAppTheme();
  const segmentWidths = useRef<number[]>([]);
  const indicatorLeft = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const selectedIndex = options.findIndex((o) => o.key === selectedKey);

  useEffect(() => {
    if (segmentWidths.current.length === options.length && selectedIndex >= 0) {
      let left = 0;
      for (let i = 0; i < selectedIndex; i++) {
        left += segmentWidths.current[i];
      }
      indicatorLeft.value = withTiming(left, { duration: 200 });
      indicatorWidth.value = withTiming(segmentWidths.current[selectedIndex], { duration: 200 });
    }
  }, [selectedIndex, options.length, indicatorLeft, indicatorWidth]);

  const handleLayout = (index: number) => (e: LayoutChangeEvent) => {
    segmentWidths.current[index] = e.nativeEvent.layout.width;
    if (index === selectedIndex) {
      let left = 0;
      for (let i = 0; i < index; i++) {
        left += segmentWidths.current[i] || 0;
      }
      indicatorLeft.value = left;
      indicatorWidth.value = e.nativeEvent.layout.width;
    }
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    left: indicatorLeft.value,
    width: indicatorWidth.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: appColors.fieldBackground, borderColor: appColors.border }]}>
      <Animated.View style={[styles.indicator, { backgroundColor: appColors.surface }, indicatorStyle]} />
      {options.map((option, index) => {
        const isSelected = option.key === selectedKey;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            onLayout={handleLayout(index)}
            style={({ pressed }) => [
              styles.segment,
              pressed && !isSelected && { backgroundColor: appColors.neutralLight },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? appColors.brand : appColors.text.primary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fiori segmented control: container #F2F2F7, 1px border #E5E5E5
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  // Fiori: selected segment = white bg, elevated
  indicator: {
    position: 'absolute',
    top: 1,
    bottom: 1,
    borderRadius: borderRadius.md - 1,
    zIndex: 0,
    ...elevation.level1,
  },
  segment: {
    flex: 1,
    height: 32,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
  },
});
