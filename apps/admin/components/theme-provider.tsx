'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AccentColor = {
  label: string;
  hue: number;
  saturation: number;
};

export const ACCENT_COLORS: AccentColor[] = [
  { label: 'Indigo', hue: 222, saturation: 100 },
  { label: 'Teal', hue: 172, saturation: 66 },
  { label: 'Violet', hue: 262, saturation: 80 },
  { label: 'Rose', hue: 351, saturation: 95 },
  { label: 'Amber', hue: 37, saturation: 92 },
  { label: 'Sky', hue: 198, saturation: 90 },
  { label: 'Emerald', hue: 152, saturation: 70 },
];

type ThemeContextValue = {
  accentIndex: number;
  setAccentIndex: (i: number) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  accentIndex: 0,
  setAccentIndex: () => {},
  isDark: true,
  setIsDark: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY_ACCENT = 'percel_admin_accent';
const STORAGE_KEY_DARK = 'percel_admin_dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accentIndex, setAccentIndexState] = useState(0);
  const [isDark, setIsDarkState] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedAccent = localStorage.getItem(STORAGE_KEY_ACCENT);
    const storedDark = localStorage.getItem(STORAGE_KEY_DARK);
    if (storedAccent !== null) {
      const idx = parseInt(storedAccent, 10);
      if (!isNaN(idx) && idx >= 0 && idx < ACCENT_COLORS.length) {
        setAccentIndexState(idx);
      }
    }
    if (storedDark !== null) {
      setIsDarkState(storedDark !== 'false');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(accentIndex, isDark);
    localStorage.setItem(STORAGE_KEY_ACCENT, String(accentIndex));
    localStorage.setItem(STORAGE_KEY_DARK, String(isDark));
  }, [accentIndex, isDark, mounted]);

  const setAccentIndex = (i: number) => setAccentIndexState(i);
  const setIsDark = (v: boolean) => setIsDarkState(v);

  return (
    <ThemeContext.Provider value={{ accentIndex, setAccentIndex, isDark, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(accentIndex: number, isDark: boolean) {
  const accent = ACCENT_COLORS[accentIndex] ?? ACCENT_COLORS[0];
  const root = document.documentElement;

  if (isDark) {
    root.style.setProperty('--background', '213 67% 7%');
    root.style.setProperty('--foreground', '220 100% 96%');
    root.style.setProperty('--card', '216 48% 12%');
    root.style.setProperty('--card-foreground', '220 100% 96%');
    root.style.setProperty('--popover', '217 51% 10%');
    root.style.setProperty('--popover-foreground', '220 100% 96%');
    root.style.setProperty('--secondary', '217 51% 10%');
    root.style.setProperty('--secondary-foreground', '220 100% 96%');
    root.style.setProperty('--muted', '217 51% 10%');
    root.style.setProperty('--muted-foreground', '220 35% 67%');
    root.style.setProperty('--border', '219 40% 19%');
    root.style.setProperty('--input', '219 40% 19%');
    root.style.setProperty('color-scheme', 'dark');
  } else {
    root.style.setProperty('--background', '220 20% 97%');
    root.style.setProperty('--foreground', '220 25% 10%');
    root.style.setProperty('--card', '0 0% 100%');
    root.style.setProperty('--card-foreground', '220 25% 10%');
    root.style.setProperty('--popover', '0 0% 100%');
    root.style.setProperty('--popover-foreground', '220 25% 10%');
    root.style.setProperty('--secondary', '220 15% 92%');
    root.style.setProperty('--secondary-foreground', '220 25% 10%');
    root.style.setProperty('--muted', '220 15% 92%');
    root.style.setProperty('--muted-foreground', '220 10% 45%');
    root.style.setProperty('--border', '220 15% 84%');
    root.style.setProperty('--input', '220 15% 84%');
    root.style.setProperty('color-scheme', 'light');
  }

  root.style.setProperty('--primary', `${accent.hue} ${accent.saturation}% 68%`);
  root.style.setProperty('--primary-foreground', isDark ? '213 67% 7%' : '0 0% 100%');
  root.style.setProperty('--ring', `${accent.hue} ${accent.saturation}% 68%`);
}
