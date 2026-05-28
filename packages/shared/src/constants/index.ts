export const APP_NAME = 'Percel';

export const Colors = {
  light: {
    primary: '#0A84FF',
    primaryDark: '#0066CC',
    success: '#30D158',
    error: '#FF453A',
    warning: '#FFD60A',
    bg: '#F2F2F7',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#6C6C70',
    border: '#E5E5EA',
  },
  dark: {
    primary: '#0A84FF',
    primaryDark: '#0066CC',
    success: '#30D158',
    error: '#FF453A',
    warning: '#FFD60A',
    bg: '#1C1C1E',
    card: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#98989D',
    border: '#38383A',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const Typography = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;
