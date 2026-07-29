'use client';

import { useState } from 'react';
import { useTheme, ACCENT_COLORS } from '@/components/theme-provider';
import { Sun, Moon, Palette, X } from 'lucide-react';

export function ThemeCustomizerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { accentIndex, setAccentIndex, isDark, setIsDark } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/40">
              <Palette className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-sm text-foreground">Theme & Appearance</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Appearance Mode
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsDark(false)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold border transition-all ${
                !isDark
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun className="h-4 w-4" />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDark(true)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold border transition-all ${
                isDark
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon className="h-4 w-4" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Accent Colors */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Accent Brand Color
          </p>
          <div className="grid grid-cols-4 gap-2.5 pt-1">
            {ACCENT_COLORS.map((color, i) => {
              const hsl = `hsl(${color.hue}, ${color.saturation}%, 60%)`;
              const isSelected = i === accentIndex;
              return (
                <button
                  key={color.label}
                  onClick={() => setAccentIndex(i)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <span
                    className="h-8 w-8 rounded-xl transition-all duration-200"
                    style={{
                      backgroundColor: hsl,
                      boxShadow: isSelected ? `0 0 0 2px ${hsl}, 0 0 12px ${hsl}77` : 'none',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                  <span className="text-[9px] font-bold text-muted-foreground group-hover:text-foreground">
                    {color.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Close CTA */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-2.5 text-xs font-extrabold text-white shadow-glow-primary"
          >
            Apply Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
