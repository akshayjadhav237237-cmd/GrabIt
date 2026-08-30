import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../theme';
import { CheckIcon, BoxIcon, CalendarIcon, LocationIcon } from './icons';

export interface OrderStatusTrackerProps {
  bookingId: string;
  isOwner?: boolean;
}

interface StageConfig {
  id: string;
  title: string;
  subtitle: string;
}

const STAGES: StageConfig[] = [
  {
    id: 'confirmed',
    title: 'Booking Confirmed',
    subtitle: 'Payment verified & order confirmed',
  },
  {
    id: 'packing',
    title: 'Item Being Packed',
    subtitle: 'Lender inspecting & packing gear',
  },
  {
    id: 'delivery',
    title: 'Out for Delivery',
    subtitle: 'Equipment in transit to your address',
  },
  {
    id: 'delivered',
    title: 'Delivered to You',
    subtitle: 'Rental active — enjoy your gear!',
  },
];

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({
  bookingId,
  isOwner = false,
}) => {
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;

    // Pulse animation for currently active node
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Listen to animated progress updates to change active index
    const listenerId = progressAnim.addListener(({ value }) => {
      if (isMounted) {
        const stage = Math.min(Math.floor(value + 0.05), 3);
        setActiveStageIndex(stage);
        if (value >= 2.95) {
          setIsCompleted(true);
        }
      }
    });

    const initTracker = async () => {
      try {
        const storageKey = `grabit_order_tracker_done_${bookingId}`;
        const alreadyDone = await AsyncStorage.getItem(storageKey);

        if (alreadyDone === 'true') {
          // Already completed on previous visit — show fully completed immediately
          progressAnim.setValue(3);
          if (isMounted) {
            setActiveStageIndex(3);
            setIsCompleted(true);
          }
          return;
        }

        // Freshly active booking: play demo speed sequence across all 4 stages (~900ms per stage)
        Animated.sequence([
          // Step 1: Confirmed to Packing
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          // Step 2: Packing to Out for Delivery
          Animated.timing(progressAnim, {
            toValue: 2,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          // Step 3: Out for Delivery to Delivered
          Animated.timing(progressAnim, {
            toValue: 3,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ]).start(async ({ finished }) => {
          if (finished && isMounted) {
            setIsCompleted(true);
            try {
              await AsyncStorage.setItem(storageKey, 'true');
            } catch {
              // Ignore async storage save errors
            }
          }
        });
      } catch {
        // Fallback: show fully completed
        progressAnim.setValue(3);
        if (isMounted) {
          setActiveStageIndex(3);
          setIsCompleted(true);
        }
      }
    };

    initTracker();

    return () => {
      isMounted = false;
      pulseLoop.stop();
      progressAnim.removeListener(listenerId);
    };
  }, [bookingId]);

  const lineWidthInterpolation = progressAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: ['0%', '33.33%', '66.66%', '100%'],
  });

  const currentStage = STAGES[activeStageIndex] || STAGES[0];

  return (
    <View style={styles.container}>
      {/* Tracker Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Order & Rental Tracker</Text>
          <View style={styles.demoBadge}>
            <View style={styles.demoDot} />
            <Text style={styles.demoBadgeText}>Demo Speed</Text>
          </View>
        </View>
        <Text style={styles.statusPillText}>
          {isCompleted ? 'Delivered' : `Stage ${activeStageIndex + 1}/4`}
        </Text>
      </View>

      {/* Dynamic Status Callout Banner */}
      <View style={styles.calloutBanner}>
        <Text style={styles.calloutTitle}>{currentStage.title}</Text>
        <Text style={styles.calloutSubtitle}>{currentStage.subtitle}</Text>
      </View>

      {/* Progress Track & Checkpoints */}
      <View style={styles.trackerTrackContainer}>
        {/* Inactive Background Line */}
        <View style={styles.backgroundTrackLine} />

        {/* Animated Active Progress Line */}
        <Animated.View
          style={[
            styles.activeTrackLine,
            {
              width: lineWidthInterpolation,
            },
          ]}
        />

        {/* Checkpoint Nodes */}
        <View style={styles.checkpointsRow}>
          {STAGES.map((stage, index) => {
            const isPassed = activeStageIndex > index || isCompleted;
            const isCurrent = activeStageIndex === index && !isCompleted;

            return (
              <View key={stage.id} style={styles.nodeColumn}>
                {isCurrent ? (
                  <Animated.View
                    style={[
                      styles.dotCircle,
                      styles.dotCircleCurrent,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    <View style={styles.activeInnerDot} />
                  </Animated.View>
                ) : (
                  <View
                    style={[
                      styles.dotCircle,
                      isPassed ? styles.dotCirclePassed : styles.dotCircleUpcoming,
                    ]}
                  >
                    {isPassed ? (
                      <CheckIcon
                        size={11}
                        color={theme.colors.textInverse}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Text style={styles.dotNumberText}>{index + 1}</Text>
                    )}
                  </View>
                )}

                <Text
                  style={[
                    styles.stageLabelText,
                    isPassed && styles.stageLabelPassed,
                    isCurrent && styles.stageLabelCurrent,
                  ]}
                  numberOfLines={2}
                >
                  {stage.title}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentTint,
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  demoBadgeText: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.accentDark,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  calloutBanner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs + 2,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  calloutTitle: {
    fontSize: theme.typography.fontSize.xs + 1,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  calloutSubtitle: {
    fontSize: theme.typography.fontSize.xs - 1,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  trackerTrackContainer: {
    position: 'relative',
    paddingVertical: theme.spacing.xs,
  },
  backgroundTrackLine: {
    position: 'absolute',
    top: 14,
    left: '12%',
    right: '12%',
    height: 3,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  activeTrackLine: {
    position: 'absolute',
    top: 14,
    left: '12%',
    maxWidth: '76%',
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  checkpointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nodeColumn: {
    width: '24%',
    alignItems: 'center',
  },
  dotCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    zIndex: 2,
    marginBottom: 6,
  },
  dotCirclePassed: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  dotCircleCurrent: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
  },
  dotCircleUpcoming: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  activeInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  dotNumberText: {
    fontSize: 9,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
  stageLabelText: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 13,
  },
  stageLabelPassed: {
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  stageLabelCurrent: {
    color: theme.colors.accentDark,
    fontWeight: theme.typography.fontWeight.bold,
  },
});
