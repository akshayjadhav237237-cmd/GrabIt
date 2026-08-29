import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Circle,
  Rect,
  G,
} from 'react-native-svg';
import theme from '../../theme';
import { IllustrationProps } from './types';

export const LoadingIllustration: React.FC<IllustrationProps> = ({
  size = 160,
  width,
  height,
  style,
  primaryColor = theme.colors.primary,
  accentColor = theme.colors.warning,
  fillColor = theme.colors.surfaceSubtle,
  secondaryColor = theme.colors.secondary,
  subtleColor = theme.colors.primarySurface,
}) => {
  const w = width ?? size;
  const h = height ?? size;

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    spinLoop.start();
    pulseLoop.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [spinAnim, pulseAnim]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Background Static Soft Pulsing Halo */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [{ scale: pulseAnim }],
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Svg width={w} height={h} viewBox="0 0 200 200" fill="none">
          <Circle cx="100" cy="100" r="75" fill={fillColor} />
          <Circle cx="100" cy="100" r="56" fill={subtleColor} opacity={0.7} />
          <Circle
            cx="100"
            cy="100"
            r="66"
            stroke={theme.colors.border}
            strokeWidth="1.5"
            strokeDasharray="4 6"
            fill="none"
          />

          {/* Static Corner Accents */}
          <Path
            d="M38 48 C38 52.5 34.5 56 30 56 C34.5 56 38 59.5 38 64 C38 59.5 41.5 56 46 56 C41.5 56 38 52.5 38 48 Z"
            fill={accentColor}
          />
          <Circle cx="166" cy="154" r="3" fill={secondaryColor} />
          <Circle cx="170" cy="52" r="2.5" fill={theme.colors.textMuted} />
          <Circle cx="34" cy="148" r="2.5" fill={secondaryColor} />
        </Svg>
      </Animated.View>

      {/* Rotating Eco Loop & Revolving Gear Layer */}
      <Animated.View
        style={{
          width: w,
          height: h,
          transform: [{ rotate: spinInterpolate }],
        }}
      >
        <Svg width={w} height={h} viewBox="0 0 200 200" fill="none">
          {/* 3-Bladed Eco Recycle Loop */}
          <G id="eco-loop">
            {/* Blade 1 (Forest Green) - Top Arc */}
            <Path
              d="M100 44 C128 44 150 64 154 92"
              stroke={primaryColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Blade 1 Arrowhead / Stylized Leaf Tip */}
            <Path
              d="M148 94 L156 94 L160 84 Z"
              stroke={primaryColor}
              strokeWidth="2"
              fill={primaryColor}
              strokeLinejoin="round"
            />

            {/* Blade 2 (Terracotta Accent) - Right/Bottom Arc */}
            <Path
              d="M150 114 C140 142 114 156 86 154"
              stroke={accentColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Blade 2 Arrowhead Tip */}
            <Path
              d="M86 160 L86 152 L76 154 Z"
              stroke={accentColor}
              strokeWidth="2"
              fill={accentColor}
              strokeLinejoin="round"
            />

            {/* Blade 3 (Secondary Light Green) - Left Arc */}
            <Path
              d="M66 140 C48 116 52 84 74 62"
              stroke={secondaryColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Blade 3 Arrowhead Tip */}
            <Path
              d="M72 56 L76 64 L84 58 Z"
              stroke={secondaryColor}
              strokeWidth="2"
              fill={secondaryColor}
              strokeLinejoin="round"
            />
          </G>

          {/* Central Revolving Gear Silhouette */}
          <G id="revolving-gear" transform="translate(100, 100)">
            {/* 6 Gear Teeth */}
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <Rect
                key={`loading-gear-tooth-${angle}`}
                x="-4"
                y="-26"
                width="8"
                height="8"
                rx="2"
                stroke={theme.colors.primaryDark}
                strokeWidth="2"
                fill={subtleColor}
                transform={`rotate(${angle} 0 0)`}
              />
            ))}

            {/* Main Gear Disc */}
            <Circle
              cx="0"
              cy="0"
              r="21"
              stroke={primaryColor}
              strokeWidth="2.5"
              fill={theme.colors.surface}
            />

            {/* Inner Recessed Groove */}
            <Circle
              cx="0"
              cy="0"
              r="13"
              stroke={theme.colors.border}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              fill={fillColor}
            />

            {/* Center Axle Hub */}
            <Circle
              cx="0"
              cy="0"
              r="7"
              stroke={theme.colors.primaryDark}
              strokeWidth="2"
              fill={theme.colors.surface}
            />

            {/* Center Core Dot */}
            <Circle cx="0" cy="0" r="3" fill={accentColor} />

            {/* Organic Orbiting Sprout Leaf */}
            <Path
              d="M14 -14 C20 -20 26 -16 24 -10 C22 -8 18 -10 14 -14 Z"
              stroke={secondaryColor}
              strokeWidth="1.5"
              fill={subtleColor}
              strokeLinejoin="round"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

export default LoadingIllustration;
