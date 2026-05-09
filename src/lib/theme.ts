import type { ThemeColors, ThemeVars, ThemeMode } from '@/types';
import { rgbToHsl, hslToRgb, rgbToCss, contrastRatio } from '@/lib/utils';

/**
 * Extract a color palette from an image URL using ColorThief v3.3+.
 * Must run client-side only.
 * getColor/getPalette return Color objects with .array(), .rgb(), .hex() methods.
 */
export async function extractColors(imageUrl: string): Promise<ThemeColors> {
  const { getColor, getPalette } = await import('colorthief');

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const dominantColor = await getColor(img);
        if (!dominantColor) throw new Error('Could not extract dominant color');
        const dominant: [number, number, number] = dominantColor.array();

        const paletteColors = await getPalette(img, { colorCount: 6 });
        if (!paletteColors || paletteColors.length === 0) throw new Error('Could not extract palette');
        const palette: [number, number, number][] = paletteColors.map(
          (c) => c.array() as [number, number, number]
        );

        // Find the most vibrant/saturated color for accent
        let accent = dominant;
        let maxSaturation = 0;
        for (const color of palette) {
          const [, s] = rgbToHsl(color[0], color[1], color[2]);
          if (s > maxSaturation) {
            maxSaturation = s;
            accent = color;
          }
        }

        // Find a muted color (lowest saturation)
        let muted = dominant;
        let minSaturation = 100;
        for (const color of palette) {
          const [, s] = rgbToHsl(color[0], color[1], color[2]);
          if (s < minSaturation) {
            minSaturation = s;
            muted = color;
          }
        }

        resolve({ dominant, accent, muted, palette });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for color extraction'));
    img.src = imageUrl;
  });
}

/**
 * Generate CSS custom property values from extracted colors and a mode.
 */
export function generateThemeVars(
  colors: ThemeColors,
  mode: ThemeMode
): ThemeVars {
  const { dominant, accent, muted } = colors;

  const [dH, dS] = rgbToHsl(dominant[0], dominant[1], dominant[2]);
  const [aH, aS] = rgbToHsl(accent[0], accent[1], accent[2]);
  const [mH, mS] = rgbToHsl(muted[0], muted[1], muted[2]);

  if (mode === 'light') {
    // Light mode: very light backgrounds, dark text
    const bg = hslToRgb(dH, Math.min(dS, 30), 96);
    const surface = hslToRgb(dH, Math.min(dS, 25), 92);
    const border = hslToRgb(dH, Math.min(dS, 20), 85);
    const accentColor = hslToRgb(aH, Math.min(aS, 70), 45);
    const accentHover = hslToRgb(aH, Math.min(aS, 75), 38);
    const mutedColor = hslToRgb(mH, Math.min(mS, 15), 55);

    // Determine text color for best contrast
    const darkText: [number, number, number] = hslToRgb(dH, Math.min(dS, 20), 12);
    const lightText: [number, number, number] = [255, 255, 255];
    const textColor = contrastRatio(darkText, bg) > contrastRatio(lightText, bg) ? darkText : lightText;
    const textSecondary = hslToRgb(dH, Math.min(dS, 15), 35);

    return {
      '--theme-bg': rgbToCss(bg),
      '--theme-surface': rgbToCss(surface),
      '--theme-text': rgbToCss(textColor),
      '--theme-text-secondary': rgbToCss(textSecondary),
      '--theme-accent': rgbToCss(accentColor),
      '--theme-accent-hover': rgbToCss(accentHover),
      '--theme-muted': rgbToCss(mutedColor),
      '--theme-border': rgbToCss(border),
    };
  } else {
    // Dark mode: very dark backgrounds, light text
    const bg = hslToRgb(dH, Math.min(dS, 25), 8);
    const surface = hslToRgb(dH, Math.min(dS, 20), 14);
    const border = hslToRgb(dH, Math.min(dS, 15), 22);
    const accentColor = hslToRgb(aH, Math.min(aS, 65), 55);
    const accentHover = hslToRgb(aH, Math.min(aS, 70), 62);
    const mutedColor = hslToRgb(mH, Math.min(mS, 15), 50);

    const lightText: [number, number, number] = hslToRgb(dH, Math.min(dS, 10), 92);
    const darkText: [number, number, number] = [0, 0, 0];
    const textColor = contrastRatio(lightText, bg) > contrastRatio(darkText, bg) ? lightText : darkText;
    const textSecondary = hslToRgb(dH, Math.min(dS, 10), 65);

    return {
      '--theme-bg': rgbToCss(bg),
      '--theme-surface': rgbToCss(surface),
      '--theme-text': rgbToCss(textColor),
      '--theme-text-secondary': rgbToCss(textSecondary),
      '--theme-accent': rgbToCss(accentColor),
      '--theme-accent-hover': rgbToCss(accentHover),
      '--theme-muted': rgbToCss(mutedColor),
      '--theme-border': rgbToCss(border),
    };
  }
}

/**
 * Default fallback theme variables
 */
export const defaultThemeVars: ThemeVars = {
  '--theme-bg': 'rgb(250, 250, 252)',
  '--theme-surface': 'rgb(240, 240, 245)',
  '--theme-text': 'rgb(20, 20, 30)',
  '--theme-text-secondary': 'rgb(100, 100, 120)',
  '--theme-accent': 'rgb(99, 102, 241)',
  '--theme-accent-hover': 'rgb(79, 70, 229)',
  '--theme-muted': 'rgb(148, 163, 184)',
  '--theme-border': 'rgb(226, 232, 240)',
};
