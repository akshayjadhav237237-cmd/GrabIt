import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors } from '../../theme';
import { IconProps } from './types';

export const ShareIcon: React.FC<IconProps> = ({
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
      <Circle cx="18" cy="5" r="3" />
      <Circle cx="6" cy="12" r="3" />
      <Circle cx="18" cy="19" r="3" />
      <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </Svg>
  );
};

export default ShareIcon;
