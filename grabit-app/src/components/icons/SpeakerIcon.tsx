import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme';
import { IconProps } from './types';

export const SpeakerIcon: React.FC<IconProps> = ({
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
      {/* Speaker enclosure cabinet */}
      <Rect x="4" y="2" width="16" height="20" rx="3" />

      {/* Tweeter (top high-frequency cone) */}
      <Circle cx="12" cy="7" r="2" />

      {/* Woofer (bottom bass cone) */}
      <Circle cx="12" cy="15" r="4" />
      <Circle cx="12" cy="15" r="1.5" />
    </Svg>
  );
};

export default SpeakerIcon;
