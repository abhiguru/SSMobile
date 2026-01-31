import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, borderRadius } from '../../constants/theme';

interface LinearProgressProps {
  progress?: number; // 0-1 for determinate
  indeterminate?: boolean;
  color?: string;
  trackColor?: string;
}

export function LinearProgress({
  progress = 0,
  indeterminate = false,
  color = colors.brand,
  trackColor = colors.border,
}: LinearProgressProps) {
  const animatedWidth = useSharedValue(0);
  const translateX = useSharedValue(-1);

  useEffect(() => {
    if (indeterminate) {
      translateX.value = withRepeat(
        withSequence(
          withTiming(-1, { duration: 0 }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      animatedWidth.value = withTiming(progress, { duration: 300 });
    }
  }, [progress, indeterminate, animatedWidth, translateX]);

  const determinateStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%` as any,
  }));

  const indeterminateStyle = useAnimatedStyle(() => ({
    width: '30%',
    transform: [{ translateX: translateX.value * 120 }],
  }));

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color },
          indeterminate ? indeterminateStyle : determinateStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
});
