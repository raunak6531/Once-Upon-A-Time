/**
 * Color extraction utility for "Once Upon A Time"
 * Extracts dominant non-greyscale colors from an image to style the reader.
 */

export interface ColorPalette {
  accent: string;
  tint: string;
}

export async function extractPaletteFromImage(imageUrl: string): Promise<ColorPalette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // Small scale for performance and better averaging
      const size = 50;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size).data;
      const buckets: { [key: string]: number } = {};

      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const a = imageData[i + 3];

        if (a < 128) continue; // Skip transparent

        const [h, s, l] = rgbToHsl(r, g, b);

        // Skip greyscale/neutral (very low saturation or very high/low lightness)
        if (s < 15 || l < 15 || l > 85) continue;

        // Bucket by hue (360 degrees)
        const hueBucket = Math.round(h / 10) * 10;
        buckets[hueBucket] = (buckets[hueBucket] || 0) + 1;
      }

      // Pick dominant hue
      let dominantHue = -1;
      let maxCount = 0;
      for (const hue in buckets) {
        if (buckets[hue] > maxCount) {
          maxCount = buckets[hue];
          dominantHue = parseInt(hue);
        }
      }

      if (dominantHue === -1) {
        resolve(null);
        return;
      }

      // Derive palette
      const accent = `hsl(${dominantHue}, 65%, 55%)`;
      const tint = `hsl(${dominantHue}, 25%, 10%)`;

      resolve({ accent, tint });
    };

    img.onerror = () => resolve(null);
  });
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}
