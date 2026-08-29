/**
 * Grabit Design System Theme
 * Aesthetic: Warm Utility
 * Deep Forest Green + Warm Cream base with Warm Terracotta / Amber accents
 */

export interface ColorTokens {
  // Base colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primarySurface: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  borderSubtle: string;

  // Accent tokens (CTAs & actions)
  accent: string;
  accentDark: string;
  accentLight: string;
  accentTint: string;

  // Supporting neutrals
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Status palette
  success: string;
  error: string;
  warning: string;
  info: string;
  statusPending: string;
  statusConfirmed: string;
  statusActive: string;
  statusCompleted: string;
  statusCancelled: string;

  // Overlay
  backdrop: string;
}

export interface SpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface FontFamilyScale {
  heading: string;
  body: string;
  mono: string;
}

export interface TypographyScale {
  fontFamily: FontFamilyScale;
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    hero: number;
  };
  fontWeight: {
    regular: '400';
    medium: '500';
    semibold: '600';
    bold: '700';
  };
  lineHeight: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    hero: number;
  };
  lineHeights: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    hero: number;
  };
}

export interface AsymmetricBorderRadius {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomRightRadius: number;
  borderBottomLeftRadius: number;
}

export interface BorderRadiusScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
  cardAsymmetric: AsymmetricBorderRadius;
  badgeAsymmetric: AsymmetricBorderRadius;
  buttonAsymmetric: AsymmetricBorderRadius;
}

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ShadowTokens {
  none: ShadowStyle;
  sm: ShadowStyle;
  md: ShadowStyle;
  lg: ShadowStyle;
}

export interface BorderWidthScale {
  none: number;
  thin: number;
  regular: number;
  medium: number;
}

export interface OpacityScale {
  active: number;
  disabled: number;
  hover: number;
}

export interface Theme {
  colors: ColorTokens;
  spacing: SpacingScale;
  typography: TypographyScale;
  borderRadius: BorderRadiusScale;
  shadows: ShadowTokens;
  borderWidth: BorderWidthScale;
  opacity: OpacityScale;
}

export const colors: ColorTokens = {
  // Base colors
  primary: '#1F4D3A',
  primaryLight: '#2D6A4F',
  primaryDark: '#1B4332',
  primarySurface: '#E8F1EC',
  secondary: '#D97D3F',
  background: '#FAF6EE',
  surface: '#FFFFFF',
  surfaceSubtle: '#F3ECE0',
  border: '#E5DDCF',
  borderSubtle: '#EFE8DC',

  // Accent tokens
  accent: '#D97D3F',
  accentDark: '#C26224',
  accentLight: '#E89862',
  accentTint: '#FDF2EB',

  // Supporting neutrals
  textPrimary: '#1F2A24',
  textSecondary: '#5C6B62',
  textMuted: '#8E9D94',
  textInverse: '#FAF6EE',

  // Status palette
  success: '#2D6A4F',
  error: '#C84B31',
  warning: '#D97D3F',
  info: '#3D6B8C',
  statusPending: '#D97D3F',
  statusConfirmed: '#3D6B8C',
  statusActive: '#2D6A4F',
  statusCompleted: '#1F4D3A',
  statusCancelled: '#C84B31',
  backdrop: 'rgba(31, 77, 58, 0.45)',
};

export const spacing: SpacingScale = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const lineHeights = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 26,
  xl: 30,
  xxl: 36,
  hero: 42,
};

export const typography: TypographyScale = {
  fontFamily: {
    heading: 'serif',
    body: 'sans-serif',
    mono: 'monospace',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 34,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: lineHeights,
  lineHeights: lineHeights,
};

export const borderRadius: BorderRadiusScale = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
  cardAsymmetric: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 10,
  },
  badgeAsymmetric: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 10,
    borderBottomLeftRadius: 6,
  },
  buttonAsymmetric: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 10,
  },
};

export const shadows: ShadowTokens = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#1F2A24',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#1F2A24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1F2A24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const borderWidth: BorderWidthScale = {
  none: 0,
  thin: 1,
  regular: 2,
  medium: 2,
};

export const opacity: OpacityScale = {
  active: 0.8,
  disabled: 0.4,
  hover: 0.9,
};

export const theme: Theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  borderWidth,
  opacity,
};

export default theme;


