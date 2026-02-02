import { useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Portal, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, borderRadius, elevation, fontFamily, fontSize } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface FioriBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  showCloseButton?: boolean;
  children: React.ReactNode;
}

export function FioriBottomSheet({
  visible,
  onDismiss,
  title,
  showCloseButton = true,
  children,
}: FioriBottomSheetProps) {
  const { appColors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    }
  }, [visible, translateY]);

  const handleDismiss = useCallback(() => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(onDismiss)();
    });
  }, [translateY, onDismiss]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleDismiss} />
        <Animated.View style={[styles.sheet, { backgroundColor: appColors.surface, paddingBottom: insets.bottom + spacing.lg }, sheetStyle]}>
          <View style={[styles.handle, { backgroundColor: appColors.fieldBorder }]} />
          {(title || showCloseButton) && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: appColors.text.primary }]}>{title}</Text>
              {showCloseButton && (
                <Pressable onPress={handleDismiss} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={24} color={appColors.text.primary} />
                </Pressable>
              )}
            </View>
          )}
          {children}
        </Animated.View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    ...elevation.level4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    flex: 1,
  },
});
