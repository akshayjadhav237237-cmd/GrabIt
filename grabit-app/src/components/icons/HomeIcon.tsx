import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';
import { IconProps } from './types';

export const HomeIcon: React.FC<IconProps> = ({
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
      <Path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
};

export default HomeIcon;
