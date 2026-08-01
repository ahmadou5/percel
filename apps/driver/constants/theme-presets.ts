export type ThemePresetId = 'cobalt' | 'emerald' | 'amber' | 'violet' | 'crimson';

export type ThemePreset = {
  id: ThemePresetId;
  name: string;
  primary: string;
  primaryDark: string;
  bg: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  iconId: string;
};

export const PRESET_THEMES: Record<ThemePresetId, ThemePreset> = {
  cobalt: {
    id: 'cobalt',
    name: 'Percel Cobalt',
    primary: '#5B8CFF',
    primaryDark: '#3A6BE0',
    bg: '#07111D',
    card: '#0D1728',
    border: '#1D2A44',
    text: '#EAF0FF',
    textSecondary: '#8FA2C7',
    iconId: 'cobalt',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Mint',
    primary: '#2DD4BF',
    primaryDark: '#14B8A6',
    bg: '#061816',
    card: '#0B2522',
    border: '#16433E',
    text: '#E6FAF7',
    textSecondary: '#7CD4C9',
    iconId: 'emerald',
  },
  amber: {
    id: 'amber',
    name: 'Golden Amber',
    primary: '#F0B35A',
    primaryDark: '#D99636',
    bg: '#181206',
    card: '#261C0B',
    border: '#453315',
    text: '#FFF8EB',
    textSecondary: '#D4B888',
    iconId: 'amber',
  },
  violet: {
    id: 'violet',
    name: 'Electric Violet',
    primary: '#A855F7',
    primaryDark: '#9333EA',
    bg: '#12071D',
    card: '#1D0C2F',
    border: '#38165B',
    text: '#F5EAFF',
    textSecondary: '#B98ADF',
    iconId: 'violet',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Pulse',
    primary: '#FB7185',
    primaryDark: '#E11D48',
    bg: '#1D070D',
    card: '#2E0B15',
    border: '#541527',
    text: '#FFEAEF',
    textSecondary: '#E08EA0',
    iconId: 'crimson',
  },
};

export const DEFAULT_THEME_PRESET = PRESET_THEMES.cobalt;
