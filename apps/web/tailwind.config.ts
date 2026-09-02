import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/shared/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        popover: 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        // Direct brand palette tokens from brand.md
        brand: {
          bg: '#07111D',
          surface: '#0D1728',
          card: '#101B2E',
          border: '#1D2A44',
          fg: '#EAF0FF',
          muted: '#8FA2C7',
          primary: '#5B8CFF',
          primarySoft: '#C7D5FF',
          accent: '#F0B35A',
          success: '#2DD4BF',
          warning: '#F7B955',
          destructive: '#FB7185',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px hsl(var(--border)), 0 24px 60px rgba(2, 8, 23, 0.45)',
        'glow-primary': '0 0 35px -5px rgba(91, 140, 255, 0.35)',
        'glow-accent': '0 0 35px -5px rgba(240, 179, 90, 0.3)',
      },
      backgroundImage: {
        'brand-grid': 'radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.15) 1px, transparent 0)',
        'brand-sheen': 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.12))',
        'hero-gradient': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.2), rgba(7, 17, 29, 0))',
      },
    },
  },
  plugins: [],
};

export default config;
