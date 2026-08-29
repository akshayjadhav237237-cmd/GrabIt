import React from 'react';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { colors } from '../../theme';
import { IconProps } from './types';

export const LaptopIcon: React.FC<IconProps> = ({
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
      {/* Laptop screen */}
      <Rect x="3" y="4" width="18" height="12" rx="2" />

      {/* Base / bottom deck */}
      <Path d="M2 18h20a1 1 0 0 1 1 1v0a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v0a1 1 0 0 1 1-1z" />

      {/* Trackpad notch */}
      <Line x1="10" y1="18" x2="14" y2="18" />
    </Svg>
  );
};

export default LaptopIcon;
