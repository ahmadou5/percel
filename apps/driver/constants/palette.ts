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

export type ThemeMode = keyof typeof Colors;
