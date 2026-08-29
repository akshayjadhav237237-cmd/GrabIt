import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  ActivityIndicator,
  PanResponderInstance,
  Platform,
  TouchableOpacity,
} from 'react-native';
import theme from '../theme';
import { ChevronIcon, CheckIcon } from './icons';

export interface SlideToConfirmProps {
  onConfirmed: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  title?: string;
  confirmedTitle?: string;
  resetTrigger?: any;
}

const KNOB_SIZE = 48;
const TRACK_HEIGHT = 56;
const TRACK_PADDING = 4;

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  onConfirmed,
  isLoading = false,
  disabled = false,
  title = 'Slide to Confirm Booking »»',
  confirmedTitle = 'Booking Confirmed',
  resetTrigger,
}) => {
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  const dragX = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0.35)).current;

  // Mutable refs to prevent stale closure issues in PanResponder & Web listeners
  const maxDragRef = useRef<number>(0);
  const trackWidthRef = useRef<number>(0);
  const isConfirmedRef = useRef<boolean>(false);
  const disabledRef = useRef<boolean>(disabled);
  const isLoadingRef = useRef<boolean>(isLoading);
  const onConfirmedRef = useRef<() => void>(onConfirmed);
  const isWebDragging = useRef<boolean>(false);
  const webStartX = useRef<number>(0);

  // Sync refs on every render
  const maxDrag = Math.max(0, trackWidth - KNOB_SIZE - TRACK_PADDING * 2);
  maxDragRef.current = maxDrag;
  trackWidthRef.current = trackWidth;
  isConfirmedRef.current = isConfirmed;
  disabledRef.current = disabled;
  isLoadingRef.current = isLoading;
  onConfirmedRef.current = onConfirmed;

  // Shimmer pulse animation for text hint
  useEffect(() => {
    if (isConfirmed || disabled || isLoading) return;

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerLoop.start();

    return () => {
      shimmerLoop.stop();
    };
  }, [isConfirmed, disabled, isLoading, shimmerAnim]);

  // Reset when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setIsConfirmed(false);
      isConfirmedRef.current = false;
      Animated.spring(dragX, {
        toValue: 0,
        bounciness: 4,
        speed: 14,
        useNativeDriver: false,
      }).start();
    }
  }, [resetTrigger, dragX]);

  const triggerConfirm = useCallback(() => {
    if (disabledRef.current || isLoadingRef.current || isConfirmedRef.current) return;
    setIsConfirmed(true);
    isConfirmedRef.current = true;
    const target = maxDragRef.current > 0 ? maxDragRef.current : 240;
    Animated.spring(dragX, {
      toValue: target,
      bounciness: 0,
      speed: 16,
      useNativeDriver: false,
    }).start(() => {
      onConfirmedRef.current?.();
    });
  }, [dragX]);

  const snapBack = useCallback(() => {
    Animated.spring(dragX, {
      toValue: 0,
      bounciness: 6,
      speed: 14,
      useNativeDriver: false,
    }).start();
  }, [dragX]);

  // PanResponder with dynamic ref reads (fixes 0-width stale closure)
  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !disabledRef.current && !isLoadingRef.current && !isConfirmedRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabledRef.current &&
        !isLoadingRef.current &&
        !isConfirmedRef.current &&
        Math.abs(gestureState.dx) > 3,
      onPanResponderGrant: () => {
        dragX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (disabledRef.current || isLoadingRef.current || isConfirmedRef.current) return;
        const max = maxDragRef.current;
        const boundedX = Math.min(Math.max(0, gestureState.dx), max > 0 ? max : 280);
        dragX.setValue(boundedX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (disabledRef.current || isLoadingRef.current || isConfirmedRef.current) return;
        const max = maxDragRef.current;
        const threshold = (max > 0 ? max : 200) * 0.65;
        if (gestureState.dx >= threshold) {
          triggerConfirm();
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: () => {
        if (!isConfirmedRef.current) {
          snapBack();
        }
      },
    })
  ).current;

  // Web Pointer & Mouse Event Handlers (ensures smooth drag on web & mobile browsers)
  const handlePointerDown = (clientX: number) => {
    if (disabledRef.current || isLoadingRef.current || isConfirmedRef.current) return;
    isWebDragging.current = true;
    webStartX.current = clientX;
    dragX.stopAnimation();
  };

  const handlePointerMove = (clientX: number) => {
    if (!isWebDragging.current || disabledRef.current || isLoadingRef.current || isConfirmedRef.current) return;
    const deltaX = clientX - webStartX.current;
    const max = maxDragRef.current > 0 ? maxDragRef.current : 240;
    const boundedX = Math.min(Math.max(0, deltaX), max);
    dragX.setValue(boundedX);
  };

  const handlePointerUp = (clientX: number) => {
    if (!isWebDragging.current) return;
    isWebDragging.current = false;
    if (disabledRef.current || isLoadingRef.current || isConfirmedRef.current) return;
    const deltaX = clientX - webStartX.current;
    const max = maxDragRef.current > 0 ? maxDragRef.current : 240;
    const threshold = max * 0.65;
    if (deltaX >= threshold) {
      triggerConfirm();
    } else {
      snapBack();
    }
  };

  const onLayoutTrack = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== trackWidth) {
      setTrackWidth(width);
      trackWidthRef.current = width;
      maxDragRef.current = Math.max(0, width - KNOB_SIZE - TRACK_PADDING * 2);
    }
  };

  // Interpolated opacity for the hint text as knob moves
  const currentMax = maxDrag > 0 ? maxDrag : 240;
  const hintOpacity = dragX.interpolate({
    inputRange: [0, Math.max(1, currentMax * 0.5), Math.max(2, currentMax * 0.85)],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  // Interpolate filled progress width
  const progressWidth = Animated.add(dragX, KNOB_SIZE / 2);

  // Web DOM Event Attachments for Desktop Mouse Dragging outside element
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const onGlobalMouseMove = (e: MouseEvent) => {
      if (isWebDragging.current) {
        handlePointerMove(e.clientX);
      }
    };

    const onGlobalMouseUp = (e: MouseEvent) => {
      if (isWebDragging.current) {
        handlePointerUp(e.clientX);
      }
    };

    const onGlobalTouchMove = (e: TouchEvent) => {
      if (isWebDragging.current && e.touches[0]) {
        handlePointerMove(e.touches[0].clientX);
      }
    };

    const onGlobalTouchEnd = (e: TouchEvent) => {
      if (isWebDragging.current && e.changedTouches[0]) {
        handlePointerUp(e.changedTouches[0].clientX);
      }
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
    window.addEventListener('touchmove', onGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', onGlobalTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
      window.removeEventListener('touchmove', onGlobalTouchMove);
      window.removeEventListener('touchend', onGlobalTouchEnd);
    };
  }, []);

  return (
    <View
      style={[
        styles.trackContainer,
        disabled && styles.disabledTrack,
      ]}
      onLayout={onLayoutTrack}
      accessibilityRole="button"
      accessibilityLabel={isConfirmed ? confirmedTitle : title}
      accessibilityState={{ disabled: disabled || isLoading }}
    >
      {/* Background fill progress */}
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: progressWidth,
            backgroundColor: isConfirmed
              ? theme.colors.primarySurface
              : theme.colors.accentTint,
          },
        ]}
      />

      {/* Center text / shimmer hint */}
      <View style={styles.hintWrapper} pointerEvents="none">
        {isConfirmed ? (
          <Text style={styles.confirmedText}>{confirmedTitle}</Text>
        ) : (
          <Animated.View
            style={[
              styles.hintAnimContainer,
              {
                opacity: Animated.multiply(hintOpacity, shimmerAnim),
              },
            ]}
          >
            <Text style={styles.hintText}>{title}</Text>
          </Animated.View>
        )}
      </View>

      {/* Tap-to-complete fallback zone for desktop / accessibility */}
      {!isConfirmed && !disabled && !isLoading && (
        <TouchableOpacity
          style={styles.tapTarget}
          activeOpacity={0.7}
          onPress={triggerConfirm}
          accessibilityLabel="Tap or slide to confirm"
        />
      )}

      {/* Draggable knob with dual PanResponder + Web Pointer support */}
      <Animated.View
        style={[
          styles.knob,
          {
            transform: [{ translateX: dragX }],
            backgroundColor: isConfirmed
              ? theme.colors.success
              : disabled
              ? theme.colors.textMuted
              : theme.colors.accent,
          },
        ]}
        {...panResponder.panHandlers}
        // @ts-ignore Web pointer/touch handlers
        onMouseDown={(e: any) => handlePointerDown(e.clientX)}
        // @ts-ignore
        onTouchStart={(e: any) => {
          if (e.touches && e.touches[0]) {
            handlePointerDown(e.touches[0].clientX);
          }
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.surface} />
        ) : isConfirmed ? (
          <CheckIcon size={22} color={theme.colors.surface} strokeWidth={2.5} />
        ) : (
          <ChevronIcon size={24} color={theme.colors.surface} strokeWidth={2.5} direction="right" />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  trackContainer: {
    height: TRACK_HEIGHT,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: TRACK_PADDING,
    // @ts-ignore web touch-action
    touchAction: 'none',
    userSelect: 'none',
  },
  disabledTrack: {
    opacity: theme.opacity.disabled,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: theme.borderRadius.lg,
  },
  hintWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: KNOB_SIZE + theme.spacing.sm,
  },
  hintAnimContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  confirmedText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.success,
    textAlign: 'center',
  },
  tapTarget: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '40%',
    zIndex: 1,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadows.md.shadowColor,
    shadowOffset: theme.shadows.md.shadowOffset,
    shadowOpacity: theme.shadows.md.shadowOpacity,
    shadowRadius: theme.shadows.md.shadowRadius,
    elevation: theme.shadows.md.elevation,
    zIndex: 2,
    cursor: 'grab',
  } as any,
});

export default SlideToConfirm;
