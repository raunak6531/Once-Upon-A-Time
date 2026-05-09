'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import type { ReaderSettings } from '@/types';

interface EpubReaderProps {
  url: string;
  initialCfi?: string | null;
  settings: ReaderSettings;
  onRelocated?: (cfi: string, progress: number) => void;
  onReady?: () => void;
  onTocLoaded?: (toc: any[]) => void;
  onChapterChange?: (chapterTitle: string) => void;
}

export interface EpubReaderRef {
  nextPage: () => void;
  prevPage: () => void;
  display: (cfi: string) => void;
  goToPercentage: (percent: number) => void;
}

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(
  ({ url, initialCfi, settings, onRelocated, onReady, onTocLoaded, onChapterChange }, ref) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renditionRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookRef = useRef<any>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initializedRef = useRef(false);

    // Expose navigation methods via ref
    useImperativeHandle(ref, () => ({
      nextPage: () => {
        renditionRef.current?.next();
      },
      prevPage: () => {
        renditionRef.current?.prev();
      },
      display: (cfi: string) => {
        renditionRef.current?.display(cfi);
      },
      goToPercentage: (percent: number) => {
        if (bookRef.current) {
          const cfi = bookRef.current.locations.cfiFromPercentage(percent);
          renditionRef.current?.display(cfi);
        }
      },
    }));

    // Theme lookup for iframe styles (must be hex/hard values, not CSS variables)
    const themePresets = useMemo(() => ({
      dark: { bg: '#141418', text: '#ffffff' },
      sepia: { bg: '#f4ecd8', text: '#000000' },
      cream: { bg: '#fffaf0', text: '#000000' },
      midnight: { bg: '#000000', text: '#ffffff' },
      solarized: { bg: '#002b36', text: '#ffffff' },
    }), []);

    // Theme mapping for EPUB content
    const getThemeStyles = useCallback(() => {
      let bgColor = '#141418';
      let textColor = '#ffffff';

      if (settings.theme === 'custom') {
        bgColor = settings.customBg || '#141418';
        textColor = settings.customText || '#e2e8f0';
      } else {
        const preset = themePresets[settings.theme as keyof typeof themePresets];
        if (preset) {
          bgColor = preset.bg;
          textColor = preset.text;
        }
      }

      const fontStack =
        settings.fontFamily === 'serif'
          ? "'Playfair Display', Georgia, serif"
          : settings.fontFamily === 'mono'
          ? "'JetBrains Mono', monospace"
          : settings.fontFamily === 'sans'
          ? "'Inter', system-ui, sans-serif"
          : ''; // Default to empty for publisher settings

      const lineHeightValue =
        settings.lineHeight === 'compact' ? 1.4 : settings.lineHeight === 'relaxed' ? 2.2 : 1.8;

      const marginValue =
        settings.margin === 'narrow' ? '5%' : settings.margin === 'wide' ? '25%' : '15%';

      const baseStyles: any = {
        html: {
          'font-size': `${settings.fontSize}% !important`,
        },
        body: {
          color: `${textColor} !important`,
          background: `${bgColor} !important`,
          'line-height': `${lineHeightValue} !important`,
          'font-size': '100% !important', // Let it inherit from html
          padding: `40px ${marginValue} !important`,
          margin: '0 !important',
          // Explicitly inherit to clear previous custom fonts if in publisher mode
          'font-family': fontStack ? `${fontStack} !important` : 'inherit !important',
        },
        'p, span, div, li, td, th, dd, dt, figcaption, caption': {
          color: `${textColor} !important`,
          'font-family': fontStack ? `${fontStack} !important` : 'inherit !important',
          'font-size': 'inherit !important',
        },
        'h1, h2, h3, h4, h5, h6': {
          color: `${textColor} !important`,
          'font-family': fontStack ? `${fontStack} !important` : 'inherit !important',
          'font-size': 'inherit !important',
        },
        'a': {
          color: 'var(--theme-accent) !important',
          'text-decoration': 'none !important',
        },
        'blockquote': {
          color: 'var(--theme-text) !important',
          'border-left': '3px solid var(--theme-accent) !important',
          'padding-left': '1em !important',
          opacity: '0.8',
        },
        img: {
          'max-width': '100% !important',
          height: 'auto !important',
          'border-radius': '8px !important',
        },
      };

      return baseStyles;
    }, [settings, themePresets]);

    // Apply settings when they change
    useEffect(() => {
      if (renditionRef.current) {
        const styles = getThemeStyles();
        // Clear and re-apply to ensure no stale styles
        renditionRef.current.themes.register('dynamic', styles);
        renditionRef.current.themes.select('dynamic');
      }
    }, [getThemeStyles]);

    // Initialize epubjs
    useEffect(() => {
      if (!viewerRef.current || initializedRef.current) return;
      initializedRef.current = true;

      const init = async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const container = viewerRef.current;
        if (!container) return;

        try {
          const ePub = await import('epubjs');
          const book = ePub.default(url);
          bookRef.current = book;

          await book.ready;
          onTocLoaded?.(book.navigation.toc);

          const rect = container.getBoundingClientRect();
          const rendition = book.renderTo(container, {
            width: Math.floor(rect.width) || 800,
            height: Math.floor(rect.height) || 600,
            spread: 'none',
            flow: 'paginated',
            manager: 'default',
          });

          renditionRef.current = rendition;

          // Initial theme application
          const styles = getThemeStyles();
          rendition.themes.register('dynamic', styles);
          rendition.themes.select('dynamic');
          rendition.themes.fontSize(`${settings.fontSize}%`);

          rendition.on('relocated', (location: any) => {
            if (location?.start?.cfi) {
              try {
                const progress = book.locations?.percentageFromCfi(location.start.cfi) || 0;
                onRelocated?.(location.start.cfi, progress);

                // Find current chapter with fallback
                let chapter: any = book.navigation.get(location.start.cfi);
                
                // Fallback: search spine/href if exact CFI match fails
                if (!chapter && book.spine) {
                   const spineItem = book.spine.get(location.start.cfi);
                   if (spineItem) {
                     chapter = book.navigation.toc.find((item: any) => item.href.includes(spineItem.href));
                   }
                }

                if (chapter) {
                  onChapterChange?.(chapter.label?.trim().replace(/\s+/g, ' ') || '');
                }
              } catch (e) {
                console.warn('Metadata sync error:', e);
                onRelocated?.(location.start.cfi, 0);
              }
            }
          });

          // Handle keyboard navigation inside the iframe
          rendition.on('keydown', (e: any) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              rendition.next();
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              rendition.prev();
            }
          });

          if (initialCfi) {
            await rendition.display(initialCfi);
          } else {
            await rendition.display();
          }

          book.locations.generate(1600).catch(() => {});

          let resizeTimeout: ReturnType<typeof setTimeout>;
          const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
              if (renditionRef.current && viewerRef.current) {
                const r = viewerRef.current.getBoundingClientRect();
                renditionRef.current.resize(Math.floor(r.width), Math.floor(r.height));
              }
            }, 250);
          };

          window.addEventListener('resize', handleResize);
          cleanupRef.current = () => {
            clearTimeout(resizeTimeout);
            window.removeEventListener('resize', handleResize);
          };

          setIsLoading(false);
          onReady?.();
        } catch (err) {
          console.error('Failed to initialize EPUB reader:', err);
          setIsLoading(false);
        }
      };

      init();

      return () => {
        cleanupRef.current?.();
        if (renditionRef.current) {
          try { renditionRef.current.destroy(); } catch { /* ignore */ }
        }
        if (bookRef.current) {
          try { bookRef.current.destroy(); } catch { /* ignore */ }
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="relative w-full h-full overflow-hidden" style={{ background: 'transparent' }}>
        <div
          ref={viewerRef}
          id="epub-viewer"
          className="w-full h-full"
          style={{
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    );
  }
);

EpubReader.displayName = 'EpubReader';
export default EpubReader;
