import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';
import { ShieldIconProps } from './types';

export const ShieldIcon: React.FC<ShieldIconProps> = ({
  size = 24,
  color = colors.textPrimary,
  strokeWidth = 2,
  withCheck = true,
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
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      {withCheck && <Path d="M9 12l2 2 4-4" />}
    </Svg>
  );
};

export default ShieldIcon;
