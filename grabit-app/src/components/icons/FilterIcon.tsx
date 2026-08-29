import React from 'react';
import Svg, { Line, Path } from 'react-native-svg';
import { colors } from '../../theme';
import { FilterIconProps } from './types';

export const FilterIcon: React.FC<FilterIconProps> = ({
  size = 24,
  color = colors.textPrimary,
  strokeWidth = 2,
  variant = 'sliders',
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
      {variant === 'funnel' ? (
        <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
      ) : (
        <>
          <Line x1="4" y1="21" x2="4" y2="14" />
          <Line x1="4" y1="10" x2="4" y2="3" />
          <Line x1="12" y1="21" x2="12" y2="12" />
          <Line x1="12" y1="8" x2="12" y2="3" />
          <Line x1="20" y1="21" x2="20" y2="16" />
          <Line x1="20" y1="12" x2="20" y2="3" />
          <Line x1="1" y1="14" x2="7" y2="14" />
          <Line x1="9" y1="8" x2="15" y2="8" />
          <Line x1="17" y1="16" x2="23" y2="16" />
        </>
      )}
    </Svg>
  );
};

export default FilterIcon;
