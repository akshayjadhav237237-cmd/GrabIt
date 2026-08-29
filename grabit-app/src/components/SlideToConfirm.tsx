import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  ActivityIndicator,
  PanResponderInstance,
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
  const currentDrag = useRef<number>(0);
  const shimmerAnim = useRef(new Animated.Value(0.35)).current;

  const maxDrag = Math.max(0, trackWidth - KNOB_SIZE - TRACK_PADDING * 2);

  // Keep track of current drag value without re-rendering
  useEffect(() => {
    const listenerId = dragX.addListener(({ value }) => {
      currentDrag.current = value;
    });
    return () => {
      dragX.removeListener(listenerId);
    };
  }, [dragX]);

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
      Animated.spring(dragX, {
        toValue: 0,
        bounciness: 4,
        speed: 14,
        useNativeDriver: false,
      }).start();
    }
  }, [resetTrigger, dragX]);

  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !isLoading && !isConfirmed,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabled && !isLoading && !isConfirmed && Math.abs(gestureState.dx) > 4,
      onPanResponderGrant: () => {
        dragX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (disabled || isLoading || isConfirmed) return;
        const boundedX = Math.min(Math.max(0, gestureState.dx), maxDrag);
        dragX.setValue(boundedX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (disabled || isLoading || isConfirmed) return;

        const threshold = maxDrag * 0.8;
        if (gestureState.dx >= threshold && maxDrag > 0) {
          // Complete drag (>= 80% width)
          setIsConfirmed(true);
          Animated.spring(dragX, {
            toValue: maxDrag,
            bounciness: 0,
            speed: 16,
            useNativeDriver: false,
          }).start(() => {
            onConfirmed();
          });
        } else {
          // Incomplete drag (< 80% width): snaps smoothly back to left
          Animated.spring(dragX, {
            toValue: 0,
            bounciness: 6,
            speed: 14,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (!isConfirmed) {
          Animated.spring(dragX, {
            toValue: 0,
            bounciness: 4,
            speed: 14,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const onLayoutTrack = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== trackWidth) {
      setTrackWidth(width);
    }
  };

  // Interpolated opacity for the hint text as knob moves
  const hintOpacity = dragX.interpolate({
    inputRange: [0, Math.max(1, maxDrag * 0.5), Math.max(2, maxDrag * 0.85)],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  // Interpolate filled progress width
  const progressWidth = Animated.add(dragX, KNOB_SIZE / 2);

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

      {/* Draggable knob */}
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
  },
});

export default SlideToConfirm;
