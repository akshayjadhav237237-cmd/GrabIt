import React from 'react';
import Svg, {
  Path,
  Circle,
  G,
  Line,
} from 'react-native-svg';
import theme from '../../theme';
import { IllustrationProps } from './types';

export const EmptyChatIllustration: React.FC<IllustrationProps> = ({
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
      {/* Background Soft Aura */}
      <Circle
        cx="100"
        cy="100"
        r="75"
        fill={fillColor}
      />
      <Circle
        cx="68"
        cy="66"
        r="36"
        fill={subtleColor}
        opacity={0.65}
      />

      {/* Decorative Sparkles & Nodes */}
      {/* Terracotta Star on Right */}
      <Path
        d="M172 68 C172 72.5 168.5 76 164 76 C168.5 76 172 79.5 172 84 C172 79.5 175.5 76 180 76 C175.5 76 172 72.5 172 68 Z"
        fill={accentColor}
      />
      <Circle cx="166" cy="144" r="3" fill={secondaryColor} />
      <Circle cx="32" cy="140" r="2.5" fill={theme.colors.textMuted} />
      <Circle cx="178" cy="112" r="2" fill={accentColor} />

      {/* Secondary Speech Bubble (Dotted Eco/Utility Background) */}
      <G id="secondary-chat-bubble">
        <Path
          d="M88 44 H146 C155 44 162 51 162 60 V92 C162 101 155 108 146 108 H128 L114 122 V108 H88 C79 108 72 101 72 92 V60 C72 51 79 44 88 44 Z"
          stroke={secondaryColor}
          strokeWidth="2"
          strokeDasharray="4 4"
          fill={subtleColor}
          strokeLinejoin="round"
        />

        {/* Message Indicator Lines */}
        <Line
          x1="90"
          y1="68"
          x2="144"
          y2="68"
          stroke={theme.colors.textMuted}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Line
          x1="90"
          y1="82"
          x2="128"
          y2="82"
          stroke={theme.colors.textMuted}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Terracotta Notification Badge Dot */}
        <Circle
          cx="150"
          cy="48"
          r="5"
          fill={accentColor}
          stroke={theme.colors.surface}
          strokeWidth="2"
        />
      </G>

      {/* Primary Speech Bubble (Main Centerpiece) */}
      <G id="primary-chat-bubble">
        {/* Main Bubble Body */}
        <Path
          d="M48 76 H126 C135 76 142 83 142 92 V126 C142 135 135 142 126 142 H76 L56 158 V142 H48 C39 142 32 135 32 126 V92 C32 83 39 76 48 76 Z"
          stroke={primaryColor}
          strokeWidth="2.5"
          fill={theme.colors.surface}
          strokeLinejoin="round"
        />

        {/* 3 Rhythmic Typing Dots with Brand Accents */}
        <Circle cx="62" cy="110" r="5" fill={accentColor} />
        <Circle cx="87" cy="110" r="5" fill={primaryColor} />
        <Circle cx="112" cy="110" r="5" fill={secondaryColor} />
      </G>

      {/* Fresh Organic Leaf Sprouting from Left Bubble Edge */}
      <G id="sprouting-leaf">
        {/* Branch / Stem */}
        <Path
          d="M34 100 C24 94 18 82 24 68"
          stroke={primaryColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Primary Leaf */}
        <Path
          d="M24 68 C16 57 30 51 36 60 C39 68 30 72 24 68 Z"
          stroke={theme.colors.primaryLight}
          strokeWidth="2"
          fill={subtleColor}
          strokeLinejoin="round"
        />
        <Path
          d="M24 68 L32 60"
          stroke={primaryColor}
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Secondary Leaf Bud */}
        <Path
          d="M26 86 C18 84 22 74 30 78 Z"
          stroke={secondaryColor}
          strokeWidth="1.8"
          fill={subtleColor}
        />
      </G>
    </Svg>
  );
};

export default EmptyChatIllustration;
