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

export const EmptyWishlistIllustration: React.FC<IllustrationProps> = ({
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
      {/* Background Subtle Aura */}
      <Circle
        cx="100"
        cy="100"
        r="75"
        fill={fillColor}
      />
      <Circle
        cx="68"
        cy="72"
        r="38"
        fill={subtleColor}
        opacity={0.6}
      />

      {/* Floating Dotted Ribbon across background */}
      <Path
        d="M24 125 C48 85 78 145 112 105 C142 70 168 125 182 90"
        stroke={theme.colors.textMuted}
        strokeWidth="2"
        strokeDasharray="4 5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Bookmark Ribbon on Top-Left */}
      <Path
        d="M44 38 V82 L55 73 L66 82 V38 Z"
        stroke={accentColor}
        strokeWidth="2"
        strokeDasharray="4 3"
        fill={subtleColor}
        opacity={0.85}
        strokeLinejoin="round"
      />

      {/* Floating Decorative Sparkles & Nodes */}
      {/* Terracotta Star */}
      <Path
        d="M32 72 C32 76 29 78 25 78 C29 78 32 80 32 84 C32 80 35 78 39 78 C35 78 32 76 32 72 Z"
        fill={accentColor}
      />
      {/* Secondary Star */}
      <Path
        d="M168 52 C168 56 165 58 162 58 C165 58 168 60 168 64 C168 60 171 58 174 58 C171 58 168 56 168 52 Z"
        fill={secondaryColor}
      />
      <Circle cx="178" cy="110" r="2.5" fill={theme.colors.textMuted} />
      <Circle cx="30" cy="144" r="3" fill={secondaryColor} />

      {/* Line-Art Heart (Main Centerpiece) */}
      <G id="wishlist-heart">
        {/* Heart Body */}
        <Path
          d="M92 60 C80 44 52 44 46 68 C40 92 68 122 92 146 C116 122 144 92 138 68 C132 44 104 44 92 60 Z"
          stroke={primaryColor}
          strokeWidth="3"
          fill={theme.colors.surface}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Heart Warm Terracotta Accent Stroke */}
        <Path
          d="M58 70 C58 58 68 50 78 50"
          stroke={accentColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Inner Heart Dotted Echo Line */}
        <Path
          d="M74 122 C64 108 58 92 60 82"
          stroke={secondaryColor}
          strokeWidth="2"
          strokeDasharray="3 3"
          strokeLinecap="round"
          fill="none"
        />
      </G>

      {/* Sprouting Eco Leaves from the Heart's Crown */}
      <G id="heart-leaves">
        {/* Main Leaf */}
        <Path
          d="M118 46 C126 32 140 34 142 44 C138 50 126 52 118 46 Z"
          stroke={secondaryColor}
          strokeWidth="2"
          fill={subtleColor}
          strokeLinejoin="round"
        />
        <Path
          d="M120 46 L132 40"
          stroke={primaryColor}
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        {/* Secondary Small Leaf */}
        <Path
          d="M136 42 C144 36 152 42 148 48 C142 51 138 47 136 42 Z"
          stroke={theme.colors.primaryLight}
          strokeWidth="1.5"
          fill={theme.colors.surface}
          strokeLinejoin="round"
        />
      </G>

      {/* Line-Art Gear Silhouette (Interlocking Rental Equipment Motif) */}
      <G id="equipment-gear" transform="translate(138, 128)">
        {/* 8 Cog Teeth */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <Rect
            key={`gear-tooth-${angle}`}
            x="-4"
            y="-27"
            width="8"
            height="8"
            rx="2"
            stroke={theme.colors.primaryDark}
            strokeWidth="2"
            fill={subtleColor}
            transform={`rotate(${angle} 0 0)`}
          />
        ))}

        {/* Outer Wheel Body */}
        <Circle
          cx="0"
          cy="0"
          r="22"
          stroke={primaryColor}
          strokeWidth="2.5"
          fill={theme.colors.surface}
        />

        {/* Inner Ring */}
        <Circle
          cx="0"
          cy="0"
          r="14"
          stroke={theme.colors.border}
          strokeWidth="1.5"
          strokeDasharray="3 3"
          fill={fillColor}
        />

        {/* Center Hub */}
        <Circle
          cx="0"
          cy="0"
          r="8"
          stroke={theme.colors.primaryDark}
          strokeWidth="2"
          fill={theme.colors.surface}
        />

        {/* Center Core Axle Dot */}
        <Circle cx="0" cy="0" r="3" fill={accentColor} />
      </G>
    </Svg>
  );
};

export default EmptyWishlistIllustration;
