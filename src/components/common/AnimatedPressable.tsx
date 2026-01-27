import { Pressable, PressableProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressableView = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableComponentProps extends PressableProps {
  scaleDown?: number;
}

export function AnimatedPressable({
  scaleDown = 0.98,
  style,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableComponentProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableView
      {...props}
      style={[animatedStyle, style]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleDown, { damping: 15, stiffness: 300 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        onPressOut?.(e);
      }}
    />
  );
}
