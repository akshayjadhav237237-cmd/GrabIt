import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';
import { colors } from '../../theme';
import { IconProps } from './types';

export const PowerToolIcon: React.FC<IconProps> = ({
  size = 24,
  color = colors.textPrimary,
  strokeWidth = 2,
  style,
}) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {/* Drill Chuck / Bit */}
      <Line x1="1" y1="8" x2="4" y2="8" />
      <Line x1="4" y1="6" x2="4" y2="10" />

      {/* Motor Housing */}
      <Path d="M4 7h9a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H8l-1.5 5.5a1 1 0 0 1-1 .7H3.5a1 1 0 0 1-1-1.2L4 12V7z" />

      {/* Battery Base */}
      <Path d="M2 19h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1z" />

      {/* Trigger */}
      <Path d="M8 11a1.5 1.5 0 0 1 1.5 1.5" />

      {/* Air vents */}
      <Line x1="12" y1="7.5" x2="12" y2="9.5" />
      <Line x1="14" y1="7.5" x2="14" y2="9.5" />
    </Svg>
  );
};

export default PowerToolIcon;
