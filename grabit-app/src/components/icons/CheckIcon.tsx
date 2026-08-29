import React from 'react';
import Svg, { Polyline } from 'react-native-svg';
import { colors } from '../../theme';
import { IconProps } from './types';

export const CheckIcon: React.FC<IconProps> = ({
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
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
};

export default CheckIcon;
