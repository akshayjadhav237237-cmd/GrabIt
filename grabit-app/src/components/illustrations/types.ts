import { StyleProp, ViewStyle } from 'react-native';

export interface IllustrationProps {
  /**
   * Shorthand for equal width and height.
   * Defaults to 160 if width and height are not provided.
   */
  size?: number;
  /** Explicit width. Overrides size if specified. */
  width?: number;
  /** Explicit height. Overrides size if specified. */
  height?: number;
  /** Custom style to pass to the root container / SVG */
  style?: StyleProp<ViewStyle>;
  /** Optional override for primary line strokes (defaults to theme.colors.primary) */
  primaryColor?: string;
  /** Optional override for warm terracotta accents (defaults to theme.colors.warning) */
  accentColor?: string;
  /** Optional override for background disc/fill (defaults to theme.colors.surfaceSubtle) */
  fillColor?: string;
  /** Optional override for secondary organic accents (defaults to theme.colors.secondary) */
  secondaryColor?: string;
  /** Optional override for subtle background highlights (defaults to theme.colors.primarySurface) */
  subtleColor?: string;
}
