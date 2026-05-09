'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ThemeColors, ThemeVars, ThemeMode } from '@/types';
import { extractColors, generateThemeVars } from '@/lib/theme';

// Default themes for when color extraction hasn't happened yet
const defaultDarkVars: ThemeVars = {
  '--theme-bg': 'rgb(17, 17, 24)',
  '--theme-surface': 'rgb(26, 26, 36)',
  '--theme-text': 'rgb(226, 232, 240)',
  '--theme-text-secondary': 'rgb(148, 163, 184)',
  '--theme-accent': 'rgb(99, 102, 241)',
  '--theme-accent-hover': 'rgb(129, 132, 252)',
  '--theme-muted': 'rgb(100, 116, 139)',
  '--theme-border': 'rgb(51, 51, 68)',
};

const defaultLightVars: ThemeVars = {
  '--theme-bg': 'rgb(250, 250, 252)',
  '--theme-surface': 'rgb(240, 240, 245)',
  '--theme-text': 'rgb(20, 20, 30)',
  '--theme-text-secondary': 'rgb(100, 100, 120)',
  '--theme-accent': 'rgb(99, 102, 241)',
  '--theme-accent-hover': 'rgb(79, 70, 229)',
  '--theme-muted': 'rgb(148, 163, 184)',
  '--theme-border': 'rgb(226, 232, 240)',
};

interface ThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  themeVars: ThemeVars;
  colors: ThemeColors | null;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  toggleMode: () => {},
  themeVars: defaultDarkVars,
  colors: null,
  isLoading: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  coverUrl: string | null;
  children: ReactNode;
}

export function ThemeProvider({ coverUrl, children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [colors, setColors] = useState<ThemeColors | null>(null);
  const [themeVars, setThemeVars] = useState<ThemeVars>(defaultDarkVars);
  const [isLoading, setIsLoading] = useState(true);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Extract colors when cover URL is available
  useEffect(() => {
    if (!coverUrl) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    extractColors(coverUrl)
      .then((extractedColors) => {
        if (!cancelled) {
          console.log('🎨 Dynamic theme: Colors extracted from cover!', extractedColors);
          setColors(extractedColors);
        }
      })
      .catch((err) => {
        console.error('🎨 Color extraction failed:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coverUrl]);

  // Regenerate theme vars when colors or mode change
  useEffect(() => {
    if (colors) {
      const vars = generateThemeVars(colors, mode);
      console.log('🎨 Dynamic theme: Applying', mode, 'mode with extracted colors');
      setThemeVars(vars);
    } else {
      // No colors extracted — use defaults for the current mode
      setThemeVars(mode === 'dark' ? defaultDarkVars : defaultLightVars);
    }
  }, [colors, mode]);

  // Build inline style from theme vars
  const style = Object.entries(themeVars).reduce(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, themeVars, colors, isLoading }}>
      <div
        style={style as React.CSSProperties}
        className="theme-root min-h-screen transition-colors duration-500"
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
