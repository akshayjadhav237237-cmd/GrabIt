import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';
import { StarIconProps } from './types';

export const StarIcon: React.FC<StarIconProps> = ({
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
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
};

export default StarIcon;
