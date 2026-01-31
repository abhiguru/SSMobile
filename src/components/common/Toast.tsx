import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, elevation, fontFamily } from '../../constants/theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const TOAST_BG: Record<ToastType, { bg: string }> = {
  success: { bg: colors.positive },
  error: { bg: colors.negative },
  info: { bg: colors.toastDefault },
  warning: { bg: colors.critical },
};

const screenWidth = Dimensions.get('window').width;

function getAutoHideDuration(config: ToastConfig): number {
  if (config.duration) return config.duration;
  if (config.action) return 8000;
  if (config.message.length > 80) return 6000;
  return 4000;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const queueRef = useRef<ToastConfig[]>([]);
  const isShowingRef = useRef(false);
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const hideToast = useCallback(() => {
    setToast(null);
    isShowingRef.current = false;
    // Process queue
    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      // Slight delay before next toast
      setTimeout(() => showToastInternal(next), 200);
    }
  }, []);

  const showToastInternal = useCallback((config: ToastConfig) => {
    isShowingRef.current = true;
    setToast(config);
    const duration = getAutoHideDuration(config);

    translateY.value = withSequence(
      withTiming(100, { duration: 0 }),
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withDelay(duration, withTiming(100, { duration: 300, easing: Easing.in(Easing.cubic) }))
    );
    opacity.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 300 }),
      withDelay(duration, withTiming(0, { duration: 300 }, () => {
        runOnJS(hideToast)();
      }))
    );
  }, [translateY, opacity, hideToast]);

  const showToast = useCallback((config: ToastConfig) => {
    if (isShowingRef.current) {
      queueRef.current.push(config);
      return;
    }
    showToastInternal(config);
  }, [showToastInternal]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const type = toast?.type || 'info';
  const toastStyle = TOAST_BG[type];

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            { bottom: insets.bottom + 72 },
            { backgroundColor: toastStyle.bg },
            animatedStyle,
          ]}
        >
          <Pressable style={styles.content} onPress={hideToast}>
            <Text variant="bodyMedium" style={styles.message}>
              {toast.message}
            </Text>
            {toast.action && (
              <Pressable
                onPress={() => {
                  toast.action?.onPress();
                  hideToast();
                }}
                style={styles.actionButton}
              >
                <Text style={styles.actionLabel}>{toast.action.label}</Text>
              </Pressable>
            )}
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    minHeight: 48,
    width: screenWidth - 32,
    alignSelf: 'center',
    borderRadius: borderRadius.md,
    ...elevation.level3,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    color: colors.text.inverse,
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionLabel: {
    color: colors.text.inverse,
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
