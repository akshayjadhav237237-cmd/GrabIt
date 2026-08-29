import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';
import { ChevronIconProps } from './types';

const directionPaths: Record<'left' | 'right' | 'up' | 'down', string> = {
  right: 'M9 18l6-6-6-6',
  left: 'M15 18l-6-6 6-6',
  up: 'M18 15l-6-6-6 6',
  down: 'M6 9l6 6 6-6',
};

export const ChevronIcon: React.FC<ChevronIconProps> = ({
  size = 24,
  color = colors.textPrimary,
  strokeWidth = 2,
  direction = 'right',
  style,
}) => {
  const d = directionPaths[direction] || directionPaths.right;

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
      <Path d={d} />
    </Svg>
  );
};

export default ChevronIcon;
