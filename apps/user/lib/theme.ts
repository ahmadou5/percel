import { useMemo } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';

import { Colors } from '@/constants/palette';
import { usePreferencesStore, type CustomTheme, type ThemeMode } from '@/store/preferences.store';

export type AppPalette = (typeof Colors)[keyof typeof Colors];

function clamp(value: number) {
  return Math.max(0, Math.min(255, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized;
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => clamp(value).toString(16).padStart(2, '0')).join('')}`;
}

function mix(hexA: string, hexB: string, ratio: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const weight = Math.max(0, Math.min(1, ratio));
  return rgbToHex(
    Math.round(a.r * (1 - weight) + b.r * weight),
    Math.round(a.g * (1 - weight) + b.g * weight),
    Math.round(a.b * (1 - weight) + b.b * weight),
  );
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const transform = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

export function isLight(hex: string) {
  return luminance(hex) > 0.5;
}

function contrastText(hex: string) {
  return isLight(hex) ? '#0B1220' : '#FFFFFF';
}

function adjustText(hex: string, background: string) {
  return isLight(background) ? mix(hex, '#000000', 0.45) : mix(hex, '#FFFFFF', 0.45);
}

export function resolvePalette(mode: ThemeMode, systemScheme: keyof typeof Colors | undefined, customTheme: CustomTheme): AppPalette {
  if (mode === 'custom') {
    const background = customTheme.background;
    const card = mix(background, contrastText(background), isLight(background) ? 0.06 : 0.08);
    const border = mix(background, contrastText(background), isLight(background) ? 0.14 : 0.18);
    const text = contrastText(background);
    const textSecondary = adjustText(text, background);
    const primary = customTheme.accent;
    const primaryDark = mix(primary, isLight(background) ? '#0B1220' : '#000000', 0.22);

    return {
      primary,
      primaryDark,
      success: '#30D158',
      error: '#FF453A',
      warning: '#FFD60A',
      bg: background,
      card,
      text,
      textSecondary,
      border,
    } as AppPalette;
  }

  const scheme = mode === 'system' ? systemScheme ?? 'light' : mode;
  return Colors[scheme] as AppPalette;
}

export function useAppPalette() {
  const deviceScheme = (useDeviceColorScheme() ?? 'light') as keyof typeof Colors;
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const customTheme = usePreferencesStore((state) => state.customTheme);

  return useMemo(() => resolvePalette(themeMode, deviceScheme, customTheme), [customTheme, deviceScheme, themeMode]);
}

export function getThemeLabel(mode: ThemeMode, systemScheme: keyof typeof Colors | undefined) {
  if (mode === 'system') return `System (${(systemScheme ?? 'light').replace(/^./, (char) => char.toUpperCase())})`;
  return mode.replace(/^./, (char) => char.toUpperCase());
}

export function buildNavigationTheme(palette: AppPalette): NavigationTheme {
  const dark = luminance(palette.bg) < 0.5;
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.bg,
      card: palette.card,
      text: palette.text,
      border: palette.border,
      notification: palette.primary,
    },
  };
}
