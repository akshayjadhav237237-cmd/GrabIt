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

export const EmptyListingsIllustration: React.FC<IllustrationProps> = ({
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
      {/* Background Decorative Aura */}
      <Circle
        cx="100"
        cy="100"
        r="75"
        fill={fillColor}
      />
      <Circle
        cx="136"
        cy="64"
        r="36"
        fill={subtleColor}
        opacity={0.7}
      />

      {/* Decorative Floating Accent Elements */}
      {/* 4-pointed sparkle on top-left */}
      <Path
        d="M38 52 C38 57 34 60 30 60 C34 60 38 63 38 68 C38 63 42 60 46 60 C42 60 38 57 38 52 Z"
        fill={accentColor}
      />
      <Circle cx="32" cy="100" r="2.5" fill={theme.colors.textMuted} />
      <Circle cx="172" cy="116" r="3" fill={secondaryColor} />
      <Circle cx="140" cy="32" r="2" fill={accentColor} />

      {/* Toolbox / Equipment Crate */}
      <G id="toolbox">
        {/* Crate Base Shadow Line */}
        <Line
          x1="32"
          y1="166"
          x2="168"
          y2="166"
          stroke={theme.colors.border}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Crate Feet */}
        <Path
          d="M44 162 V166 H56 V162"
          stroke={primaryColor}
          strokeWidth="2"
          strokeLinejoin="round"
          fill={fillColor}
        />
        <Path
          d="M144 162 V166 H156 V162"
          stroke={primaryColor}
          strokeWidth="2"
          strokeLinejoin="round"
          fill={fillColor}
        />

        {/* Crate Main Body */}
        <Rect
          x="36"
          y="112"
          width="128"
          height="50"
          rx="8"
          stroke={primaryColor}
          strokeWidth="2.5"
          fill={theme.colors.surface}
        />

        {/* Horizontal Dotted Utility Seam */}
        <Line
          x1="36"
          y1="127"
          x2="164"
          y2="127"
          stroke={theme.colors.border}
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />

        {/* Toolbox Sturdy Top Handle */}
        <Path
          d="M84 112 V96 C84 91.5 87.5 88 92 88 H108 C112.5 88 116 91.5 116 96 V112"
          stroke={theme.colors.primaryDark}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Handle grip bar accent */}
        <Line
          x1="89"
          y1="96"
          x2="111"
          y2="96"
          stroke={secondaryColor}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Latches with Terracotta Accent */}
        <Rect
          x="58"
          y="118"
          width="14"
          height="18"
          rx="3"
          stroke={accentColor}
          strokeWidth="2"
          fill={fillColor}
        />
        <Line
          x1="62"
          y1="127"
          x2="68"
          y2="127"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
        />

        <Rect
          x="128"
          y="118"
          width="14"
          height="18"
          rx="3"
          stroke={accentColor}
          strokeWidth="2"
          fill={fillColor}
        />
        <Line
          x1="132"
          y1="127"
          x2="138"
          y2="127"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </G>

      {/* Line-Art Camera */}
      <G id="camera">
        {/* Camera Viewfinder Bump */}
        <Path
          d="M72 46 V40 C72 37.5 74 36 76.5 36 H93.5 C96 36 98 37.5 98 40 V46"
          stroke={primaryColor}
          strokeWidth="2.5"
          fill={subtleColor}
          strokeLinejoin="round"
        />

        {/* Shutter Button (Terracotta Accent) */}
        <Rect
          x="58"
          y="39"
          width="9"
          height="7"
          rx="2"
          fill={accentColor}
          stroke={accentColor}
          strokeWidth="1"
        />

        {/* Camera Mode Dial */}
        <Rect
          x="103"
          y="41"
          width="14"
          height="5"
          rx="2"
          fill={theme.colors.textMuted}
        />

        {/* Camera Main Body */}
        <Rect
          x="52"
          y="46"
          width="78"
          height="52"
          rx="7"
          stroke={primaryColor}
          strokeWidth="2.5"
          fill={theme.colors.surface}
        />

        {/* Grip Detail Lines */}
        <Line
          x1="120"
          y1="56"
          x2="120"
          y2="88"
          stroke={theme.colors.border}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 3"
        />

        {/* Red / Terracotta Sensor Accent Dot */}
        <Circle cx="64" cy="58" r="3" fill={accentColor} />

        {/* Camera Lens Outer Ring */}
        <Circle
          cx="91"
          cy="72"
          r="19"
          stroke={primaryColor}
          strokeWidth="2.5"
          fill={fillColor}
        />

        {/* Camera Lens Inner Optical Ring */}
        <Circle
          cx="91"
          cy="72"
          r="12"
          stroke={theme.colors.primaryLight}
          strokeWidth="2"
          fill={subtleColor}
        />

        {/* Aperture Center Core */}
        <Circle cx="91" cy="72" r="5" fill={primaryColor} />

        {/* Glass Reflection Arc */}
        <Path
          d="M84 65 C88 61 95 61 99 65"
          stroke={secondaryColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      </G>

      {/* Organic Sprouting Leaf Motif */}
      <G id="leaf-motif">
        {/* Curving Branch */}
        <Path
          d="M130 112 C142 98 152 78 156 56"
          stroke={primaryColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Top Organic Leaf */}
        <Path
          d="M156 56 C147 41 165 35 172 45 C175 55 164 61 156 56 Z"
          stroke={theme.colors.primaryLight}
          strokeWidth="2"
          fill={subtleColor}
          strokeLinejoin="round"
        />
        {/* Top Leaf Central Vein */}
        <Path
          d="M156 56 L164 47"
          stroke={primaryColor}
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        {/* Middle Leaf */}
        <Path
          d="M144 84 C158 78 168 86 162 96 C153 100 143 93 144 84 Z"
          stroke={secondaryColor}
          strokeWidth="2"
          fill={subtleColor}
          strokeLinejoin="round"
        />
        <Path
          d="M146 87 L155 91"
          stroke={primaryColor}
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Lower Sprout Bud */}
        <Path
          d="M136 102 C143 98 147 103 144 108 C140 110 136 107 136 102 Z"
          stroke={primaryColor}
          strokeWidth="1.5"
          fill={theme.colors.surface}
        />
      </G>
    </Svg>
  );
};

export default EmptyListingsIllustration;
