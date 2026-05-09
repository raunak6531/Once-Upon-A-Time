'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, Highlighter, List, Search, Share2, StickyNote, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SettingsPopover from './SettingsPopover';
import { useBookProgress } from '@/hooks/useBookProgress';
import { useReaderPreferences } from '@/hooks/useReaderPreferences';
import type { EpubReaderRef } from './EpubReader';
import type { ReaderBookmark, ReaderHighlight, ReaderSearchResult, ReaderSettings, TocEntry } from '@/types';
import { extractPaletteFromImage } from '@/lib/colorExtraction';
import { OUATLogo } from './OUATLogo';
import ReaderSidebar from './ReaderSidebar';
import { Pin, PinOff } from 'lucide-react';

// Dynamically import EpubReader with SSR disabled
const EpubReaderComponent = dynamic(() => import('./EpubReader'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-[#0c0a1a]">
      <div className="relative">
        <OUATLogo size={80} className="relative z-10" />
        <div className="absolute inset-0 blur-2xl opacity-20 bg-amber-500 rounded-full animate-pulse" />
      </div>
      <div className="mt-8 text-center">
        <p className="text-sm font-serif tracking-[0.2em] text-amber-500/80 uppercase animate-pulse">
          Opening Your Story...
        </p>
      </div>
    </div>
  ),
});

interface ReaderControlsProps {
  bookId: string;
  bookTitle: string;
  epubUrl: string;
  initialCfi: string | null;
  coverUrl?: string | null;
}

export default function ReaderControls({
  bookId,
  bookTitle,
  epubUrl,
  initialCfi,
  coverUrl,
}: ReaderControlsProps) {
  const router = useRouter();
  const readerRef = useRef<EpubReaderRef>(null);
  const { saveCfi } = useBookProgress(bookId, initialCfi);
  const { settings, isPinned, setSettings, setIsPinned } = useReaderPreferences(bookId);

  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'bookmarks' | 'notes' | 'search'>('toc');
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>(() => {
    if (typeof window === 'undefined') return [];

    const saved = window.localStorage.getItem(`bookmarks_${bookId}`);
    if (!saved) return [];

    try {
      return JSON.parse(saved) as ReaderBookmark[];
    } catch (e) {
      console.error('Failed to parse bookmarks', e);
      return [];
    }
  });
  const [highlights, setHighlights] = useState<ReaderHighlight[]>(() => {
    if (typeof window === 'undefined') return [];

    const saved = window.localStorage.getItem(`highlights_${bookId}`);
    if (!saved) return [];

    try {
      return JSON.parse(saved) as ReaderHighlight[];
    } catch (e) {
      console.error('Failed to parse highlights', e);
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReaderSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingHighlight, setPendingHighlight] = useState<{ cfi: string; text: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [currentChapter, setCurrentChapter] = useState('');
  const [currentCfi, setCurrentCfi] = useState<string | null>(initialCfi);
  const [palette, setPalette] = useState<{ accent: string; tint: string } | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchRequestRef = useRef(0);

  // Auto-hide controls after inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  }, []);

  useEffect(() => {
    if (isPinned) {
      return;
    }

    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
    const handleTouch = () => resetHideTimer();

    window.addEventListener('touchstart', handleTouch);

    return () => {
      window.removeEventListener('touchstart', handleTouch);
      clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer, isPinned]);

  // Color extraction from cover
  useEffect(() => {
    if (coverUrl) {
      extractPaletteFromImage(coverUrl).then((p) => {
        if (p) setPalette(p);
      });
    }
  }, [coverUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSidebarTab('search');
        setIsSidebarOpen(true);
        setShowControls(true);
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          readerRef.current?.prevPage();
          break;
        case 'ArrowRight':
          readerRef.current?.nextPage();
          break;
        case 't':
        case 'T':
          setIsSidebarOpen((prev) => !prev);
          break;
        case 's':
        case 'S':
          const btn = document.getElementById('settings-btn');
          btn?.click();
          break;
        case 'f':
        case 'F':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
        case 'Escape':
          setShowControls(true);
          setIsSidebarOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRelocated = useCallback(
    (cfi: string, progressPercent: number) => {
      saveCfi(cfi);
      setProgress(Math.round(progressPercent * 100));
      setCurrentCfi(cfi);
    },
    [saveCfi]
  );

  const toggleBookmark = useCallback(() => {
    if (!currentCfi) return;
    
    setBookmarks(prev => {
      const exists = prev.find(b => b.cfi === currentCfi);
      let next;
      if (exists) {
        next = prev.filter(b => b.cfi !== currentCfi);
      } else {
        next = [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          cfi: currentCfi,
          label: currentChapter || `Page at ${progress}%`,
          date: new Date().toISOString()
        }];
      }
      localStorage.setItem(`bookmarks_${bookId}`, JSON.stringify(next));
      return next;
    });
  }, [currentCfi, currentChapter, progress, bookId]);

  const removeBookmark = useCallback((cfi: string) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.cfi !== cfi);
      localStorage.setItem(`bookmarks_${bookId}`, JSON.stringify(next));
      return next;
    });
  }, [bookId]);

  const saveHighlight = useCallback((note: string) => {
    if (!pendingHighlight) return;

    setHighlights((prev) => {
      const next = [
        {
          id: crypto.randomUUID(),
          cfi: pendingHighlight.cfi,
          text: pendingHighlight.text,
          note: note.trim(),
          chapter: currentChapter,
          date: new Date().toISOString(),
        },
        ...prev.filter((highlight) => highlight.cfi !== pendingHighlight.cfi),
      ];
      localStorage.setItem(`highlights_${bookId}`, JSON.stringify(next));
      return next;
    });

    setPendingHighlight(null);
    setNoteDraft('');
    setSidebarTab('notes');
  }, [bookId, currentChapter, pendingHighlight]);

  const removeHighlight = useCallback((id: string) => {
    setHighlights((prev) => {
      const next = prev.filter((highlight) => highlight.id !== id);
      localStorage.setItem(`highlights_${bookId}`, JSON.stringify(next));
      return next;
    });
  }, [bookId]);

  const runSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (query.length < 2) return;

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setIsSearching(true);
    setHasSearched(true);
    setSearchError(null);

    try {
      const results = await readerRef.current?.searchBook(query) ?? [];
      if (searchRequestRef.current === requestId) {
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Failed to search book:', error);
      if (searchRequestRef.current === requestId) {
        setSearchResults([]);
        setSearchError('Search failed for this book. Try another phrase.');
      }
    } finally {
      if (searchRequestRef.current === requestId) {
        setIsSearching(false);
      }
    }
  }, [searchQuery]);

  const jumpToSearchResult = useCallback((cfi: string) => {
    readerRef.current?.showSearchResult(cfi);
    setIsSidebarOpen(false);
  }, []);

  const jumpTo = useCallback((cfi: string) => {
    readerRef.current?.display(cfi);
    setIsSidebarOpen(false);
  }, []);

  const handleSettingsChange = useCallback((newSettings: Partial<ReaderSettings>) => {
    setSettings(newSettings);
  }, [setSettings]);

  // Theme mapping for chrome logic
  const themePresets = useMemo(() => ({
    dark: { bg: '#141418', text: '#ffffff', surface: '#1e1e24' },
    sepia: { bg: '#f4ecd8', text: '#000000', surface: '#e8dfc4' },
    cream: { bg: '#fffaf0', text: '#000000', surface: '#f5efe0' },
    midnight: { bg: '#000000', text: '#ffffff', surface: '#111111' },
    solarized: { bg: '#001e26', text: '#ffffff', surface: '#073642' },
  }), []);

  // Theme styles
  const themeVars = useMemo(() => {
    const isCustom = settings.theme === 'custom';
    const preset = !isCustom ? themePresets[settings.theme as keyof typeof themePresets] : null;
    
    return {
      '--theme-bg': isCustom ? settings.customBg : preset?.bg,
      '--theme-surface': isCustom ? settings.customBg : preset?.surface,
      '--theme-text': isCustom ? settings.customText : preset?.text,
      '--theme-accent': '#fbbf24',
      '--theme-accent-tint': 'rgba(251, 191, 36, 0.1)',
    } as React.CSSProperties;
  }, [settings.theme, settings.customBg, settings.customText, themePresets]);

  return (
    <div
      className="reader-container transition-colors duration-500"
      style={{ 
        ...themeVars,
        backgroundColor: 'var(--theme-bg)'
      }}
      data-theme={settings.theme}
    >
      <ReaderSidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        toc={toc}
        bookmarks={bookmarks}
        highlights={highlights}
        searchQuery={searchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        hasSearched={hasSearched}
        searchError={searchError}
        onJump={jumpTo}
        onRemoveBookmark={removeBookmark}
        onRemoveHighlight={removeHighlight}
        onSearchQueryChange={(query) => {
          setSearchQuery(query);
          if (query.trim().length < 2) {
            setSearchError(null);
          }
        }}
        onSearchSubmit={runSearch}
        onSearchResultClick={jumpToSearchResult}
        currentChapter={currentChapter}
        activeTab={sidebarTab}
        setActiveTab={setSidebarTab}
      />
      {/* Tap Zones */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div 
          className="absolute inset-y-0 left-0 w-16 sm:w-24 cursor-pointer pointer-events-auto" 
          onClick={() => readerRef.current?.prevPage()}
        />
        <div 
          className="absolute inset-y-0 right-0 w-16 sm:w-24 cursor-pointer pointer-events-auto" 
          onClick={() => readerRef.current?.nextPage()}
        />
      </div>

      {/* Top Navigation Bar */}
      <div
        className="absolute top-0 left-0 right-0 z-30 px-6 py-4 flex items-center justify-between transition-all duration-500"
        style={{
          transform: showControls ? 'translateY(0)' : 'translateY(-100%)',
          opacity: showControls ? 1 : 0,
          background: `linear-gradient(to bottom, var(--theme-bg) 0%, transparent 100%)`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/library')}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="hidden sm:block">
            <h2 className="text-xs font-serif font-semibold tracking-wide text-[var(--theme-text)] opacity-40 uppercase mb-0.5">
              {bookTitle}
            </h2>
            <div className="text-sm font-serif font-bold text-[var(--theme-text)] truncate max-w-xs">
              {currentChapter || 'Reading...'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const nextPinned = !isPinned;
              setIsPinned(nextPinned);
              if (nextPinned) setShowControls(true);
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${
              isPinned 
                ? 'bg-[var(--theme-accent)] text-black border-[var(--theme-accent)]' 
                : 'hover:bg-[var(--theme-surface)] text-[var(--theme-text)] border-[var(--theme-border)]'
            }`}
            title={isPinned ? "Unpin Controls" : "Pin Controls"}
          >
            {isPinned ? <Pin className="w-5 h-5" /> : <PinOff className="w-5 h-5 opacity-50" />}
          </button>
          <button 
            onClick={toggleBookmark}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${
              bookmarks.find(b => b.cfi === currentCfi)
                ? 'bg-[var(--theme-accent)] text-black border-[var(--theme-accent)]'
                : 'hover:bg-[var(--theme-surface)] text-[var(--theme-text)] border-[var(--theme-border)]'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${bookmarks.find(b => b.cfi === currentCfi) ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={() => {
              setSidebarTab('toc');
              setIsSidebarOpen(true);
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setSidebarTab('notes');
              setIsSidebarOpen(true);
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${
              highlights.length > 0
                ? 'bg-[var(--theme-accent)] text-black border-[var(--theme-accent)]'
                : 'hover:bg-[var(--theme-surface)] text-[var(--theme-text)] border-[var(--theme-border)]'
            }`}
            title="Notes"
          >
            <StickyNote className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setSidebarTab('search');
              setIsSidebarOpen(true);
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <SettingsPopover
            settings={settings}
            onSettingsChange={handleSettingsChange}
            suggestedColors={palette}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 pt-4 pb-4">
        <EpubReaderComponent
          ref={readerRef}
          url={epubUrl}
          initialCfi={initialCfi}
          settings={settings}
          onRelocated={handleRelocated}
          onTocLoaded={setToc}
          onChapterChange={setCurrentChapter}
          highlights={highlights}
          onTextSelected={(selection) => {
            setPendingHighlight(selection);
            setNoteDraft('');
            setShowControls(true);
          }}
          onHighlightClick={(highlight) => {
            setSidebarTab('notes');
            setIsSidebarOpen(true);
            readerRef.current?.display(highlight.cfi);
          }}
        />
      </div>

      {pendingHighlight && (
        <div className="absolute inset-x-4 bottom-24 z-40 mx-auto max-w-xl rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-accent)]">
                <Highlighter className="w-3.5 h-3.5" />
                New Highlight
              </div>
              <blockquote className="mt-3 max-h-24 overflow-y-auto border-l-2 border-[var(--theme-accent)] pl-3 text-sm font-serif leading-relaxed opacity-80">
                {pendingHighlight.text}
              </blockquote>
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingHighlight(null);
                setNoteDraft('');
              }}
              className="p-1 opacity-50 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Add a note..."
            className="mt-4 min-h-20 w-full resize-none rounded-lg border border-[var(--theme-border)] bg-white/5 p-3 text-sm outline-none focus:border-[var(--theme-accent)]"
          />

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => saveHighlight('')}
              className="rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs font-bold uppercase tracking-wider opacity-70 transition-opacity hover:opacity-100"
            >
              Highlight Only
            </button>
            <button
              type="button"
              onClick={() => saveHighlight(noteDraft)}
              className="rounded-lg bg-[var(--theme-accent)] px-3 py-2 text-xs font-bold uppercase tracking-wider text-black"
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Bottom Scrubber */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 px-8 py-6 transition-all duration-500"
        style={{
          transform: showControls ? 'translateY(0)' : 'translateY(100%)',
          opacity: showControls ? 1 : 0,
          background: `linear-gradient(to top, var(--theme-bg) 0%, transparent 100%)`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-secondary)]">
            <div className="flex gap-4">
              <span>Chapter Progression</span>
              <span className="opacity-40">•</span>
              <span className="text-[var(--theme-accent)]">~{Math.max(1, Math.round((100 - progress) / 5))} mins left</span>
            </div>
            <span className="text-[var(--theme-accent)]">{progress}%</span>
          </div>
          
          <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden cursor-pointer group/scrub"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percent = x / rect.width;
              readerRef.current?.goToPercentage(percent);
            }}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-[var(--theme-accent)] shimmer-gold transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-center items-center gap-8 pt-2">
             <button 
              onClick={() => readerRef.current?.prevPage()}
              className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] transition-colors"
             >
               <ChevronLeft className="w-6 h-6" />
             </button>
             <button className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] transition-colors">
               <Share2 className="w-5 h-5" />
             </button>
             <button 
              onClick={() => readerRef.current?.nextPage()}
              className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] transition-colors"
             >
               <ChevronRight className="w-6 h-6" />
             </button>
          </div>
        </div>
      </div>

      {/* Ambient Glow behind chrome */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.05) 0%, transparent 80%)`,
          opacity: showControls ? 0.4 : 0,
        }}
      />
    </div>
  );
}
