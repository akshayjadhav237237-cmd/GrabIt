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

export const EmptySearchIllustration: React.FC<IllustrationProps> = ({
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
        cx="134"
        cy="66"
        r="36"
        fill={subtleColor}
        opacity={0.65}
      />

      {/* Dotted Rolling Landscape Horizons */}
      <G id="landscape-horizon">
        {/* Upper Rolling Hill (Dotted) */}
        <Path
          d="M24 142 C56 126 86 138 122 128 C150 118 172 132 186 142"
          stroke={theme.colors.textMuted}
          strokeWidth="2"
          strokeDasharray="4 5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Lower Ground Horizon */}
        <Path
          d="M18 164 C52 154 92 158 130 148 C158 140 178 154 190 164"
          stroke={theme.colors.border}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Lone Eco Plant Sprout on Horizon */}
        <Path
          d="M152 128 V114 C152 109 160 107 160 114 C160 118 152 118 152 118"
          stroke={secondaryColor}
          strokeWidth="1.8"
          fill={subtleColor}
          strokeLinejoin="round"
        />
        <Path
          d="M152 118 C146 114 144 118 152 122"
          stroke={theme.colors.primaryLight}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      </G>

      {/* Floating Accent Sparkles & Nodes */}
      {/* Terracotta Star on Top-Right */}
      <Path
        d="M152 46 C152 50.5 148.5 54 144 54 C148.5 54 152 57.5 152 62 C152 57.5 155.5 54 160 54 C155.5 54 152 50.5 152 46 Z"
        fill={accentColor}
      />
      <Circle cx="176" cy="88" r="3" fill={secondaryColor} />
      <Circle cx="36" cy="68" r="2.5" fill={theme.colors.textMuted} />
      <Circle cx="170" cy="164" r="2.5" fill={accentColor} />

      {/* Magnifying Glass (Main Feature) */}
      <G id="magnifying-glass">
        {/* Handle Assembly (Rotated 45 degrees) */}
        <G transform="translate(110, 110) rotate(45)">
          {/* Metal Collar */}
          <Rect
            x="-7"
            y="-4"
            width="14"
            height="7"
            rx="2"
            stroke={theme.colors.primaryDark}
            strokeWidth="2"
            fill={accentColor}
          />

          {/* Wooden/Utility Grip Handle */}
          <Rect
            x="-6"
            y="2"
            width="12"
            height="44"
            rx="6"
            stroke={primaryColor}
            strokeWidth="2.5"
            fill={theme.colors.surface}
          />

          {/* Handle Grip Inlay Accent Line */}
          <Line
            x1="0"
            y1="10"
            x2="0"
            y2="38"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </G>

        {/* Outer Lens Frame Ring */}
        <Circle
          cx="82"
          cy="82"
          r="38"
          stroke={primaryColor}
          strokeWidth="3"
          fill={theme.colors.surface}
        />

        {/* Inner Lens Optical Zone */}
        <Circle
          cx="82"
          cy="82"
          r="30"
          stroke={subtleColor}
          strokeWidth="2"
          fill={fillColor}
          opacity={0.8}
        />

        {/* Glass Light Reflection Arcs */}
        <Path
          d="M62 64 C68 56 76 52 86 52"
          stroke={secondaryColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M58 76 C60 70 64 66 70 62"
          stroke={secondaryColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Search Focal Reticle / Empty Discovery Target */}
        <Circle
          cx="82"
          cy="82"
          r="11"
          stroke={accentColor}
          strokeWidth="2"
          strokeDasharray="3 3"
          fill="none"
        />
        <Line
          x1="82"
          y1="67"
          x2="82"
          y2="70"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Line
          x1="82"
          y1="94"
          x2="82"
          y2="97"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Line
          x1="67"
          y1="82"
          x2="70"
          y2="82"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Line
          x1="94"
          y1="82"
          x2="97"
          y2="82"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Circle cx="82" cy="82" r="2.5" fill={accentColor} />
      </G>
    </Svg>
  );
};

export default EmptySearchIllustration;
