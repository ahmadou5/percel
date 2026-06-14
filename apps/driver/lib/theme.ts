import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

// ── Percel dark-premium palette ──────────────────────────────────────────────
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
    primaryDark: '#003D99',
    success: '#30D158',
    error: '#FF453A',
    warning: '#FFD60A',
    bg: '#0B1220',
    card: '#141C2E',
    text: '#FFFFFF',
    textSecondary: '#8A94A8',
    border: '#232D42',
  },
} as const;

export type AppPalette = (typeof Colors)['dark'] | (typeof Colors)['light'];

function luminance(hex: string) {
  const n = hex.replace('#', '');
  const v = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  const int = parseInt(v, 16);
  const transform = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * transform((int >> 16) & 255) + 0.7152 * transform((int >> 8) & 255) + 0.0722 * transform(int & 255);
}

export function isLight(hex: string) {
  return luminance(hex) > 0.5;
}

export function hexToRgba(hex: string, alpha: number) {
  const n = hex.replace('#', '');
  const v = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  const int = parseInt(v, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

export function useAppPalette(): AppPalette {
  const scheme = useColorScheme() ?? 'dark';
  return useMemo(() => Colors[scheme] as AppPalette, [scheme]);
}
