import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';
import { HeartIconProps } from './types';

export const HeartIcon: React.FC<HeartIconProps> = ({
  size = 24,
  color = colors.textPrimary,
  strokeWidth = 2,
  filled = false,
  style,
}) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </Svg>
  );
};

export default HeartIcon;
