import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors } from '../../theme';
import { PlusIconProps } from './types';

export const PlusIcon: React.FC<PlusIconProps> = ({
  size = 24,
  color = colors.textPrimary,
  strokeWidth = 2,
  circled = false,
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
      {circled ? (
        <>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="8" x2="12" y2="16" />
          <Line x1="8" y1="12" x2="16" y2="12" />
        </>
      ) : (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" />
          <Line x1="5" y1="12" x2="19" y2="12" />
        </>
      )}
    </Svg>
  );
};

export default PlusIcon;
