import React from 'react';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';
import { IconProps } from './types';

export const MicIcon: React.FC<IconProps> = ({
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
      {/* Microphone capsule */}
      <Rect x="9" y="2" width="6" height="11" rx="3" />

      {/* Pickup arc */}
      <Path d="M19 10v1a7 7 0 0 1-14 0v-1" />

      {/* Stand post */}
      <Line x1="12" y1="18" x2="12" y2="22" />

      {/* Stand base */}
      <Line x1="8" y1="22" x2="16" y2="22" />
    </Svg>
  );
};

export default MicIcon;
