'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import type { ReaderHighlight, ReaderSearchResult, ReaderSettings, TocEntry } from '@/types';

interface EpubReaderProps {
  url: string;
  initialCfi?: string | null;
  settings: ReaderSettings;
  highlights?: ReaderHighlight[];
  onRelocated?: (cfi: string, progress: number) => void;
  onReady?: () => void;
  onTocLoaded?: (toc: TocEntry[]) => void;
  onChapterChange?: (chapterTitle: string) => void;
  onTextSelected?: (selection: { cfi: string; text: string }) => void;
  onHighlightClick?: (highlight: ReaderHighlight) => void;
}

type ThemeStyleValue = string | number | Record<string, string | number>;
type ThemeStyles = Record<string, ThemeStyleValue>;

interface RenditionLocation {
  start?: {
    cfi?: string;
  };
}

interface NavigationEntry {
  href: string;
  label?: string;
}

interface EpubContents {
  window?: Window;
}

interface EpubSearchMatch {
  cfi: string;
  excerpt: string;
}

interface EpubSection {
  contents?: unknown;
  href: string;
  index: number;
  linear: boolean;
  load: (request?: unknown) => unknown;
  unload: () => void;
  find: (query: string) => EpubSearchMatch[];
  search?: (query: string) => EpubSearchMatch[];
}

interface EpubSpine {
  each: (callback: (section: EpubSection) => void) => void;
}

interface EpubBook {
  getRange: (cfi: string) => Promise<Range | null>;
  load: (path: string) => Promise<unknown>;
  locations: {
    cfiFromPercentage: (percent: number) => string;
    generate: (chars: number) => Promise<unknown>;
    percentageFromCfi: (cfi: string) => number;
  };
  navigation: {
    get: (target: string) => NavigationEntry | undefined;
    toc: TocEntry[];
  };
  ready: Promise<unknown>;
  renderTo: (container: HTMLElement, options: Record<string, string | number>) => EpubRendition;
  spine: EpubSpine & {
    get: (target: string | number) => EpubSection | null;
  };
  destroy: () => void;
}

interface EpubRendition {
  annotations: {
    highlight: (
      cfi: string,
      data?: Record<string, string>,
      cb?: () => void,
      className?: string,
      styles?: Record<string, string>
    ) => void;
    remove: (cfi: string, type?: 'highlight' | 'underline' | 'mark') => void;
    underline: (
      cfi: string,
      data?: Record<string, string>,
      cb?: () => void,
      className?: string,
      styles?: Record<string, string>
    ) => void;
  };
  destroy: () => void;
  display: (target?: string) => Promise<unknown>;
  next: () => void;
  on: (event: string, callback: (...args: never[]) => void) => void;
  prev: () => void;
  resize: (width: number, height: number) => void;
  themes: {
    fontSize: (size: string) => void;
    register: (name: string, styles: ThemeStyles) => void;
    select: (name: string) => void;
  };
}

export interface EpubReaderRef {
  nextPage: () => void;
  prevPage: () => void;
  display: (cfi: string) => void;
  goToPercentage: (percent: number) => void;
  searchBook: (query: string) => Promise<ReaderSearchResult[]>;
  showSearchResult: (cfi: string) => void;
}

const EpubReader = forwardRef<EpubReaderRef, EpubReaderProps>(
  ({
    url,
    initialCfi,
    settings,
    highlights = [],
    onRelocated,
    onReady,
    onTocLoaded,
    onChapterChange,
    onTextSelected,
    onHighlightClick,
  }, ref) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const renditionRef = useRef<EpubRendition | null>(null);
    const bookRef = useRef<EpubBook | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const renderedHighlightsRef = useRef<Set<string>>(new Set());
    const temporarySearchCfiRef = useRef<string | null>(null);
    const temporarySearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isRenditionReady, setIsRenditionReady] = useState(false);
    const initializedRef = useRef(false);

    const fetchEpubArchive = useCallback(async (sourceUrl: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);

      try {
        const response = await fetch(sourceUrl, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`EPUB request failed with ${response.status}`);
        }

        return await response.arrayBuffer();
      } finally {
        clearTimeout(timeout);
      }
    }, []);

    const chapterForSection = useCallback((section: EpubSection) => {
      const exact = bookRef.current?.navigation.get(section.href);
      if (exact?.label) return exact.label.trim().replace(/\s+/g, ' ');

      const nestedFind = (items: TocEntry[]): TocEntry | undefined => {
        for (const item of items) {
          if (item.href?.split('#')[0] === section.href || item.href?.includes(section.href)) return item;
          const nested = item.subitems ? nestedFind(item.subitems) : undefined;
          if (nested) return nested;
        }
      };

      return nestedFind(bookRef.current?.navigation.toc || [])?.label || `Section ${section.index + 1}`;
    }, []);

    const clearTemporarySearchMark = useCallback(() => {
      if (temporarySearchTimerRef.current) {
        clearTimeout(temporarySearchTimerRef.current);
        temporarySearchTimerRef.current = null;
      }

      if (temporarySearchCfiRef.current) {
        renditionRef.current?.annotations.remove(temporarySearchCfiRef.current, 'underline');
        temporarySearchCfiRef.current = null;
      }
    }, []);

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
      searchBook: async (query: string) => {
        const book = bookRef.current;
        const normalizedQuery = query.trim();
        if (!book || normalizedQuery.length < 2) return [];

        const sections: EpubSection[] = [];
        book.spine.each((section) => {
          if (section.linear) sections.push(section);
        });

        const results: ReaderSearchResult[] = [];

        for (const section of sections) {
          const wasLoaded = Boolean(section.contents);

          try {
            await section.load(book.load.bind(book));
            const matches = section.search ? section.search(normalizedQuery) : section.find(normalizedQuery);
            const chapter = chapterForSection(section);

            matches.forEach((match, index) => {
              results.push({
                id: `${section.index}-${index}-${match.cfi}`,
                cfi: match.cfi,
                excerpt: match.excerpt.trim().replace(/\s+/g, ' '),
                chapter,
                sectionIndex: section.index,
              });
            });
          } catch (error) {
            console.warn('Failed to search EPUB section:', section.href, error);
          } finally {
            if (!wasLoaded) {
              section.unload();
            }
          }
        }

        return results;
      },
      showSearchResult: (cfi: string) => {
        const rendition = renditionRef.current;
        if (!rendition) return;

        clearTemporarySearchMark();
        temporarySearchCfiRef.current = cfi;
        rendition.annotations.underline(
          cfi,
          { kind: 'search-result' },
          undefined,
          'epubjs-search-result',
          {
            stroke: '#38bdf8',
            'stroke-opacity': '0.95',
            'stroke-width': '3',
            'mix-blend-mode': 'normal',
          }
        );
        rendition.display(cfi);
        temporarySearchTimerRef.current = setTimeout(clearTemporarySearchMark, 6500);
      },
    }), [chapterForSection, clearTemporarySearchMark]);

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

      const baseStyles: ThemeStyles = {
        '::selection': {
          background: 'rgba(251, 191, 36, 0.28) !important',
        },
        '.epubjs-hl': {
          fill: 'rgba(251, 191, 36, 0.38) !important',
          'fill-opacity': '1 !important',
          'mix-blend-mode': 'multiply',
        },
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

    useEffect(() => {
      const rendition = renditionRef.current;
      if (!rendition || !isRenditionReady) return;

      const nextCfis = new Set(highlights.map((highlight) => highlight.cfi));

      renderedHighlightsRef.current.forEach((cfi) => {
        if (!nextCfis.has(cfi)) {
          rendition.annotations.remove(cfi, 'highlight');
          renderedHighlightsRef.current.delete(cfi);
        }
      });

      highlights.forEach((highlight) => {
        if (renderedHighlightsRef.current.has(highlight.cfi)) return;

        rendition.annotations.highlight(
          highlight.cfi,
          { id: highlight.id },
          () => onHighlightClick?.(highlight),
          undefined,
          {
            fill: 'rgba(251, 191, 36, 0.38)',
            'fill-opacity': '1',
            'mix-blend-mode': 'multiply',
          }
        );
        renderedHighlightsRef.current.add(highlight.cfi);
      });
    }, [highlights, isRenditionReady, onHighlightClick]);

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
          const archive = await fetchEpubArchive(url);
          const book = ePub.default(archive) as unknown as EpubBook;
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

          rendition.on('relocated', (location: RenditionLocation) => {
            if (location?.start?.cfi) {
              try {
                  const locations = book.locations;
                  let progress = 0;
                  if (locations && typeof locations.percentageFromCfi === 'function') {
                    const p = locations.percentageFromCfi(location.start.cfi);
                    // epubjs returns -1 or 0 if locations aren't ready
                    progress = p >= 0 ? p : 0;
                  }
                  
                  onRelocated?.(location.start.cfi, progress);

                  // Find current chapter with fallback
                  let chapter: NavigationEntry | undefined = book.navigation.get(location.start.cfi);
                
                // Fallback: search spine/href if exact CFI match fails
                if (!chapter && book.spine) {
                   const spineItem = book.spine.get(location.start.cfi);
                   if (spineItem) {
                     chapter = book.navigation.toc.find((item: TocEntry) => item.href.includes(spineItem.href));
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

          rendition.on('selected', (cfiRange: string, contents: EpubContents) => {
            book.getRange(cfiRange).then((range: Range | null) => {
              const text = range?.toString().trim().replace(/\s+/g, ' ');
              if (text) {
                onTextSelected?.({ cfi: cfiRange, text });
              }
              contents?.window?.getSelection()?.removeAllRanges();
            });
          });

          // Handle keyboard navigation inside the iframe
          rendition.on('keydown', (e: KeyboardEvent) => {
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
          setIsRenditionReady(true);

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
          setLoadError(
            err instanceof Error && err.name === 'AbortError'
              ? 'This EPUB request timed out. Please refresh and try again.'
              : 'This EPUB could not be loaded. Please refresh, or upload the book again if the problem continues.'
          );
          setIsLoading(false);
        }
      };

      init();

      return () => {
        clearTemporarySearchMark();
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
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <div
              className="max-w-md rounded-xl border p-5 text-center"
              style={{
                background: 'rgba(20, 20, 24, 0.9)',
                borderColor: 'rgba(251, 191, 36, 0.18)',
                color: 'var(--theme-text)',
              }}
            >
              <p className="text-sm leading-6">{loadError}</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

EpubReader.displayName = 'EpubReader';
export default EpubReader;
