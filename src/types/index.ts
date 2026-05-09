export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  epub_file_url: string;
  current_cfi: string | null;
  created_at: string;
}

export interface ThemeColors {
  dominant: [number, number, number];
  accent: [number, number, number];
  muted: [number, number, number];
  palette: [number, number, number][];
}

export interface ThemeVars {
  '--theme-bg': string;
  '--theme-surface': string;
  '--theme-text': string;
  '--theme-text-secondary': string;
  '--theme-accent': string;
  '--theme-accent-hover': string;
  '--theme-muted': string;
  '--theme-border': string;
}

export type ThemeMode = 'light' | 'dark';
