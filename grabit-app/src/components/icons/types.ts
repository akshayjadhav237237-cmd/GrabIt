import { StyleProp, ViewStyle } from 'react-native';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export interface PlusIconProps extends IconProps {
  circled?: boolean;
}

export interface HeartIconProps extends IconProps {
  filled?: boolean;
}

export interface StarIconProps extends IconProps {
  filled?: boolean;
}

export interface ChevronIconProps extends IconProps {
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface AlertIconProps extends IconProps {
  variant?: 'triangle' | 'circle';
}

export interface ShieldIconProps extends IconProps {
  withCheck?: boolean;
}

export interface FilterIconProps extends IconProps {
  variant?: 'sliders' | 'funnel';
}

