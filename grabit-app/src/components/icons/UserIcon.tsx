import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../../theme';
import { IconProps } from './types';

export const UserIcon: React.FC<IconProps> = ({
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
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
};

export default UserIcon;
