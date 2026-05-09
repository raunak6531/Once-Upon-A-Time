'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { ThemeMode } from '@/types';

interface EpubReaderProps {
  url: string;
  initialCfi?: string | null;
  fontSize?: number;
  mode?: ThemeMode;
  onRelocated?: (cfi: string, progress: number) => void;
  onReady?: () => void;
}

export interface EpubReaderRef {
  nextPage: () => void;
  prevPage: () => void;
  setFontSize: (size: number) => void;
}

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(
  ({ url, initialCfi, fontSize = 100, mode = 'dark', onRelocated, onReady }, ref) => {
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
      setFontSize: (size: number) => {
        if (renditionRef.current) {
          renditionRef.current.themes.fontSize(`${size}%`);
        }
      },
    }));

    // Get the text/bg styles for the current mode
    const getThemeStyles = useCallback((currentMode: ThemeMode) => {
      const isDark = currentMode === 'dark';
      return {
        body: {
          color: isDark ? '#e2e8f0 !important' : '#1a202c !important',
          background: isDark ? '#141418 !important' : '#fafafa !important',
          'font-family': "'Inter', 'Georgia', serif !important",
          'line-height': '1.8 !important',
          padding: '20px 5% !important',
          margin: '0 !important',
        },
        'p, span, div, li, td, th, dd, dt, figcaption, caption': {
          color: isDark ? '#e2e8f0 !important' : '#1a202c !important',
        },
        'h1, h2, h3, h4, h5, h6': {
          color: isDark ? '#f1f5f9 !important' : '#111827 !important',
        },
        'a': {
          color: isDark ? '#93c5fd !important' : '#2563eb !important',
        },
        'em, i': {
          color: isDark ? '#cbd5e1 !important' : '#374151 !important',
        },
        'strong, b': {
          color: isDark ? '#f1f5f9 !important' : '#111827 !important',
        },
        'blockquote': {
          color: isDark ? '#94a3b8 !important' : '#6b7280 !important',
          'border-left': isDark ? '3px solid #475569 !important' : '3px solid #d1d5db !important',
          'padding-left': '1em !important',
        },
        img: {
          'max-width': '100% !important',
          height: 'auto !important',
        },
      };
    }, []);

    // Update theme when mode changes (after initial load)
    useEffect(() => {
      if (!renditionRef.current || !initializedRef.current) return;

      const styles = getThemeStyles(mode);

      // Re-register the theme with new styles
      renditionRef.current.themes.register('custom', styles);
      renditionRef.current.themes.select('custom');

      // Force re-render of current page to apply new styles
      try {
        const currentLocation = renditionRef.current.currentLocation();
        if (currentLocation?.start?.cfi) {
          renditionRef.current.display(currentLocation.start.cfi);
        }
      } catch {
        // If we can't get location, try refreshing the view
        try {
          renditionRef.current.views()?.forEach(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (view: any) => view.render?.()
          );
        } catch { /* ignore */ }
      }
    }, [mode, getThemeStyles]);

    // Initialize epubjs
    useEffect(() => {
      if (!viewerRef.current || initializedRef.current) return;
      initializedRef.current = true;

      const init = async () => {
        // Give the DOM a moment to settle
        await new Promise((resolve) => setTimeout(resolve, 200));

        const container = viewerRef.current;
        if (!container) return;

        try {
          const ePub = await import('epubjs');
          const book = ePub.default(url);
          bookRef.current = book;

          await book.ready;

          // Calculate dimensions from the container
          const rect = container.getBoundingClientRect();
          const width = Math.floor(rect.width) || 800;
          const height = Math.floor(rect.height) || 600;

          const rendition = book.renderTo(container, {
            width: width,
            height: height,
            spread: 'none',
            flow: 'paginated',
            manager: 'default',
          });

          renditionRef.current = rendition;

          // Register and apply theme
          const styles = getThemeStyles(mode);
          rendition.themes.register('custom', styles);
          rendition.themes.select('custom');
          rendition.themes.fontSize(`${fontSize}%`);

          // Listen for relocated events
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rendition.on('relocated', (location: any) => {
            if (location?.start?.cfi) {
              try {
                const progress = book.locations?.percentageFromCfi(location.start.cfi) || 0;
                onRelocated?.(location.start.cfi, progress);
              } catch {
                onRelocated?.(location.start.cfi, 0);
              }
            }
          });

          // Handle keyboard navigation inside the iframe
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

          // Display at the saved CFI or the start
          if (initialCfi) {
            await rendition.display(initialCfi);
          } else {
            await rendition.display();
          }

          // Generate locations for progress tracking (async, non-blocking)
          book.locations.generate(1600).catch(() => {
            console.warn('Location generation failed — progress tracking may be inaccurate');
          });

          // Handle window resize with debounce
          let resizeTimeout: ReturnType<typeof setTimeout>;
          const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
              if (renditionRef.current && viewerRef.current) {
                const r = viewerRef.current.getBoundingClientRect();
                const w = Math.floor(r.width) || 800;
                const h = Math.floor(r.height) || 600;
                renditionRef.current.resize(w, h);
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
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: 'var(--theme-accent)',
                  animation: 'pulse-glow 2s infinite',
                }}
              >
                <span className="text-white text-lg">📖</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                Loading book...
              </p>
            </div>
          </div>
        )}
        <div
          ref={viewerRef}
          id="epub-viewer"
          className="w-full h-full"
          style={{
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.5s ease',
            overflow: 'hidden',
          }}
        />
      </div>
    );
  }
);

EpubReader.displayName = 'EpubReader';
export default EpubReader;
