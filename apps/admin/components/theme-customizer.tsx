'use client';

import { useTheme, ACCENT_COLORS } from '@/components/theme-provider';
import { Monitor, Moon, Sun } from 'lucide-react';

export function ThemeCustomizer() {
  const { accentIndex, setAccentIndex, isDark, setIsDark } = useTheme();

  return (
    <div className="space-y-6">
      {/* Accent Color */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Accent color
        </p>
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map((color, i) => {
            const hsl = `hsl(${color.hue}, ${color.saturation}%, 60%)`;
            const isSelected = i === accentIndex;
            return (
              <button
                key={color.label}
                onClick={() => setAccentIndex(i)}
                title={color.label}
                className="relative flex flex-col items-center gap-1.5 group"
              >
                <span
                  className="w-9 h-9 rounded-xl transition-all duration-200 ring-offset-2 ring-offset-background"
                  style={{
                    backgroundColor: hsl,
                    boxShadow: isSelected
                      ? `0 0 0 2px ${hsl}, 0 0 16px ${hsl}55`
                      : '0 0 0 2px transparent',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
                <span
                  className="text-[10px] font-medium transition-colors"
                  style={{ color: isSelected ? hsl : undefined }}
                >
                  {color.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode toggle */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Appearance
        </p>
        <div className="flex gap-3">
          {[
            { label: 'Light', value: false, Icon: Sun },
            { label: 'Dark', value: true, Icon: Moon },
          ].map(({ label, value, Icon }) => {
            const isSelected = isDark === value;
            return (
              <button
                key={label}
                onClick={() => setIsDark(value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.2)]'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
