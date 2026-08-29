import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  G,
  Line,
} from 'react-native-svg';
import theme from '../../theme';
import { IllustrationProps } from './types';

export const EmptyBookingsIllustration: React.FC<IllustrationProps> = ({
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

  return (
    <Svg
      width={w}
      height={h}
      viewBox="0 0 200 200"
      fill="none"
      style={style}
    >
      {/* Background Soft Backdrop */}
      <Rect
        x="30"
        y="30"
        width="140"
        height="140"
        rx="32"
        fill={fillColor}
      />
      <Circle
        cx="140"
        cy="66"
        r="34"
        fill={subtleColor}
        opacity={0.65}
      />

      {/* Decorative Sparkles & Nodes */}
      {/* 4-pointed Terracotta Sparkle on Top-Left */}
      <Path
        d="M36 58 C36 62.5 32.5 66 28 66 C32.5 66 36 69.5 36 74 C36 69.5 39.5 66 44 66 C39.5 66 36 62.5 36 58 Z"
        fill={accentColor}
      />
      <Circle cx="172" cy="46" r="3" fill={secondaryColor} />
      <Circle cx="34" cy="120" r="2.5" fill={theme.colors.textMuted} />
      <Circle cx="178" cy="126" r="2.5" fill={accentColor} />

      {/* Ground Shadow Baseline */}
      <Line
        x1="36"
        y1="172"
        x2="170"
        y2="172"
        stroke={theme.colors.border}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Line-Art Calendar */}
      <G id="calendar">
        {/* Calendar Body */}
        <Rect
          x="44"
          y="44"
          width="112"
          height="114"
          rx="10"
          stroke={primaryColor}
          strokeWidth="2.5"
          fill={theme.colors.surface}
        />

        {/* Top Header Bar */}
        <Path
          d="M44 54 C44 48.5 48.5 44 54 44 H146 C151.5 44 156 48.5 156 54 V72 H44 Z"
          fill={subtleColor}
          stroke={primaryColor}
          strokeWidth="2.5"
        />

        {/* Binder Ring 1 (Left) */}
        <Rect
          x="66"
          y="36"
          width="8"
          height="16"
          rx="4"
          stroke={theme.colors.primaryDark}
          strokeWidth="2"
          fill={theme.colors.surface}
        />

        {/* Binder Ring 2 (Right) */}
        <Rect
          x="126"
          y="36"
          width="8"
          height="16"
          rx="4"
          stroke={theme.colors.primaryDark}
          strokeWidth="2"
          fill={theme.colors.surface}
        />

        {/* Calendar Grid Lines */}
        <Line
          x1="44"
          y1="96"
          x2="156"
          y2="96"
          stroke={theme.colors.borderSubtle}
          strokeWidth="1.5"
        />
        <Line
          x1="44"
          y1="122"
          x2="156"
          y2="122"
          stroke={theme.colors.borderSubtle}
          strokeWidth="1.5"
        />
        <Line
          x1="82"
          y1="72"
          x2="82"
          y2="158"
          stroke={theme.colors.borderSubtle}
          strokeWidth="1.5"
        />
        <Line
          x1="118"
          y1="72"
          x2="118"
          y2="158"
          stroke={theme.colors.borderSubtle}
          strokeWidth="1.5"
        />

        {/* Empty / Highlighted Slot with Dotted Accent */}
        <Circle
          cx="100"
          cy="109"
          r="9"
          stroke={accentColor}
          strokeWidth="2"
          strokeDasharray="3 3"
          fill="none"
        />
        <Circle cx="100" cy="109" r="3" fill={accentColor} />

        {/* Subtle Date Indicator Dots in previous slots */}
        <Circle cx="63" cy="84" r="2" fill={theme.colors.textMuted} />
        <Circle cx="100" cy="84" r="2" fill={theme.colors.textMuted} />
        <Circle cx="137" cy="84" r="2" fill={theme.colors.textMuted} />
        <Circle cx="63" cy="109" r="2" fill={theme.colors.textMuted} />
      </G>

      {/* Rental Package / Handshake Box (Foreground Center-Right) */}
      <G id="rental-package">
        {/* Package Main Box */}
        <Rect
          x="88"
          y="112"
          width="76"
          height="56"
          rx="8"
          stroke={primaryColor}
          strokeWidth="2.5"
          fill={theme.colors.surface}
        />

        {/* Terracotta Ribbon Cross */}
        <Line
          x1="126"
          y1="112"
          x2="126"
          y2="168"
          stroke={accentColor}
          strokeWidth="2"
        />
        <Line
          x1="88"
          y1="140"
          x2="164"
          y2="140"
          stroke={accentColor}
          strokeWidth="2"
        />

        {/* Tied Ribbon Bow on Top of Package */}
        <Path
          d="M126 112 C118 100 106 102 112 110 C118 116 126 112 126 112 Z"
          stroke={accentColor}
          strokeWidth="2"
          fill={subtleColor}
          strokeLinejoin="round"
        />
        <Path
          d="M126 112 C134 100 146 102 140 110 C134 116 126 112 126 112 Z"
          stroke={accentColor}
          strokeWidth="2"
          fill={subtleColor}
          strokeLinejoin="round"
        />
        <Circle cx="126" cy="112" r="3" fill={accentColor} />

        {/* Shipping / Rental Label */}
        <Line
          x1="96"
          y1="124"
          x2="114"
          y2="124"
          stroke={theme.colors.textMuted}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <Line
          x1="96"
          y1="130"
          x2="108"
          y2="130"
          stroke={theme.colors.textMuted}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Sustainable Borrowing Eco Tag */}
        <Path
          d="M148 132 C158 124 168 134 160 144 C152 146 146 138 148 132 Z"
          stroke={secondaryColor}
          strokeWidth="2"
          fill={subtleColor}
          strokeLinejoin="round"
        />
        <Path
          d="M148 132 L158 140"
          stroke={primaryColor}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

export default EmptyBookingsIllustration;
