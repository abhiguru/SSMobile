import { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Pressable,
  Image,
  BackHandler,
} from 'react-native';
import { Portal } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD = SCREEN_WIDTH / 4;
const VELOCITY_THRESHOLD = 500;

export interface PreviewImage {
  uri: string;
  headers?: Record<string, string>;
}

interface ImagePreviewModalProps {
  images: PreviewImage[];
  visible: boolean;
  initialIndex: number;
  onClose: () => void;
}

export function ImagePreviewModal({
  images,
  visible,
  initialIndex,
  onClose,
}: ImagePreviewModalProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [visible, initialIndex]);

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const resetZoom = useCallback(() => {
    'worklet';
    scale.value = withTiming(1, { duration: 300 });
    savedScale.value = 1;
    translateX.value = withTiming(0, { duration: 300 });
    translateY.value = withTiming(0, { duration: 300 });
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // ── Gestures (all callbacks run entirely on UI thread) ────────

  const pinchFocalX = useSharedValue(0);
  const pinchFocalY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      'worklet';
      pinchFocalX.value = e.focalX;
      pinchFocalY.value = e.focalY;
    })
    .onUpdate((e) => {
      'worklet';
      const newScale = Math.max(1, Math.min(savedScale.value * e.scale, MAX_SCALE));
      scale.value = newScale;
    })
    .onEnd(() => {
      'worklet';
      if (scale.value <= 1.05) {
        resetZoom();
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .minDistance(5)
    .minPointers(1)
    .maxPointers(2)
    .onUpdate((e) => {
      'worklet';
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (savedScale.value > 1) {
        const s = scale.value;
        const maxX = (SCREEN_WIDTH * (s - 1)) / 2;
        const maxY = (SCREEN_HEIGHT * (s - 1)) / 2;
        const clampedX = Math.max(-maxX, Math.min(maxX, translateX.value));
        const clampedY = Math.max(-maxY, Math.min(maxY, translateY.value));
        translateX.value = withTiming(clampedX, { duration: 200 });
        translateY.value = withTiming(clampedY, { duration: 200 });
        savedTranslateX.value = clampedX;
        savedTranslateY.value = clampedY;
      } else {
        if (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD) {
          runOnJS(goNext)();
        } else if (e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD) {
          runOnJS(goPrev)();
        }
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd(() => {
      'worklet';
      if (savedScale.value > 1) {
        resetZoom();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE, { duration: 300 });
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan);
  const gesture = Gesture.Exclusive(doubleTap, composed);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Reset zoom when page changes via swipe
  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [activeIndex]);

  if (!visible || !images.length) return null;
  const activeImage = images[activeIndex];

  return (
    <Portal>
      <View style={styles.fullscreen}>
        <StatusBar hidden />
        <GestureHandlerRootView style={styles.backdrop}>
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.imageContainer, animatedStyle]}>
              <Image
                source={{ uri: activeImage.uri, headers: activeImage.headers }}
                style={styles.image}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>

          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel={t('common.closePreview')}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </Pressable>

          {images.length > 1 && (
            <View style={styles.dotsContainer} pointerEvents="none">
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </GestureHandlerRootView>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
