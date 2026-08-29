import React from 'react';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { colors } from '../../theme';
import { IconProps } from './types';

export const DroneIcon: React.FC<IconProps> = ({
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
      {/* Center body / gimbal pod */}
      <Rect x="9" y="9" width="6" height="6" rx="1.5" />
      <Circle cx="12" cy="12" r="1" fill={color} />

      {/* Diagonal motor arms */}
      <Line x1="6.5" y1="6.5" x2="9" y2="9" />
      <Line x1="17.5" y1="6.5" x2="15" y2="9" />
      <Line x1="6.5" y1="17.5" x2="9" y2="15" />
      <Line x1="17.5" y1="17.5" x2="15" y2="15" />

      {/* Top-left rotor */}
      <Circle cx="5" cy="5" r="2.5" />
      <Line x1="2" y1="5" x2="8" y2="5" />

      {/* Top-right rotor */}
      <Circle cx="19" cy="5" r="2.5" />
      <Line x1="16" y1="5" x2="22" y2="5" />

      {/* Bottom-left rotor */}
      <Circle cx="5" cy="19" r="2.5" />
      <Line x1="2" y1="19" x2="8" y2="19" />

      {/* Bottom-right rotor */}
      <Circle cx="19" cy="19" r="2.5" />
      <Line x1="16" y1="19" x2="22" y2="19" />
    </Svg>
  );
};

export default DroneIcon;
