'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, ChevronsUp, Highlighter, List, Search, Share2, StickyNote, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SettingsPopover from './SettingsPopover';
import AmbiencePopover from './AmbiencePopover';
import { useBookProgress } from '@/hooks/useBookProgress';
import { useAmbientSound } from '@/hooks/useAmbientSound';
import { useReaderPreferences } from '@/hooks/useReaderPreferences';
import { useReadingSession } from '@/hooks/useReadingSession';
import type { EpubReaderRef } from './EpubReader';
import type { ReaderBookmark, ReaderHighlight, ReaderSearchResult, ReaderSettings, TocEntry } from '@/types';
import { extractPaletteFromImage } from '@/lib/colorExtraction';
import { OUATLogo } from './OUATLogo';
import ReaderSidebar from './ReaderSidebar';
import { Pin, PinOff } from 'lucide-react';
import { 
  fetchAnnotations, 
  saveBookmark as cloudSaveBookmark, 
  deleteBookmark as cloudDeleteBookmark,
  saveHighlight as cloudSaveHighlight,
  deleteHighlight as cloudDeleteHighlight
} from '@/lib/annotations';
import { fetchDefinition, type DictionaryDefinition } from '@/lib/dictionary';
import { Book as BookIcon, Loader2 } from 'lucide-react';

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
  initialProgressPercent?: number | null;
  initialTotalReadingSeconds?: number | null;
}

export default function ReaderControls({
  bookId,
  bookTitle,
  epubUrl,
  initialCfi,
  coverUrl,
  initialProgressPercent,
  initialTotalReadingSeconds,
}: ReaderControlsProps) {
  const router = useRouter();
  const readerRef = useRef<EpubReaderRef>(null);
  const { saveCfi } = useBookProgress(bookId, initialCfi);
  const { settings, isPinned, ambience, setSettings, setIsPinned, setAmbience } = useReaderPreferences(bookId);
  useAmbientSound(ambience);

  const [progress, setProgress] = useState(Math.round(initialProgressPercent || 0));
  const [isReaderReady, setIsReaderReady] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'bookmarks' | 'notes' | 'search'>('toc');
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const [highlights, setHighlights] = useState<ReaderHighlight[]>([]);
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
  const [dictionaryData, setDictionaryData] = useState<DictionaryDefinition | null>(null);
  const [isDictLoading, setIsDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchRequestRef = useRef(0);
  const { recordActivity } = useReadingSession(bookId, progress, isReaderReady);

  // Auto-hide controls after inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  }, []);

  const revealControls = useCallback(() => {
    if (isPinned) {
      setShowControls(true);
      return;
    }

    resetHideTimer();
  }, [isPinned, resetHideTimer]);

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

  // Load cloud annotations
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAnnotations(bookId);
        setBookmarks(data.bookmarks);
        setHighlights(data.highlights);
      } catch (err) {
        console.error('Failed to load cloud annotations:', err);
      }
    }
    load();
  }, [bookId]);

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
      const nextProgress = Math.round(progressPercent * 100);
      saveCfi(cfi, nextProgress);
      setProgress(nextProgress);
      setCurrentCfi(cfi);
      recordActivity();
    },
    [recordActivity, saveCfi]
  );

  const toggleBookmark = useCallback(async () => {
    if (!currentCfi) return;
    
    const existing = bookmarks.find(b => b.cfi === currentCfi);
    if (existing) {
      setBookmarks(prev => prev.filter(b => b.cfi !== currentCfi));
      try {
        await cloudDeleteBookmark(existing.id);
      } catch (err) {
        console.error('Failed to delete bookmark:', err);
      }
    } else {
      const tempId = crypto.randomUUID();
      const label = currentChapter || `Page at ${progress}%`;
      const tempBookmark: ReaderBookmark = {
        id: tempId,
        cfi: currentCfi,
        label,
        date: new Date().toISOString()
      };
      
      setBookmarks(prev => [...prev, tempBookmark]);
      
      try {
        const saved = await cloudSaveBookmark(bookId, { cfi: currentCfi, label });
        setBookmarks(prev => prev.map(b => b.id === tempId ? saved : b));
      } catch (err) {
        console.error('Failed to save bookmark:', err);
        setBookmarks(prev => prev.filter(b => b.id !== tempId));
      }
    }
  }, [currentCfi, currentChapter, progress, bookId, bookmarks]);

  const removeBookmark = useCallback(async (cfi: string) => {
    const existing = bookmarks.find(b => b.cfi === cfi);
    if (!existing) return;

    setBookmarks(prev => prev.filter(b => b.cfi !== cfi));
    try {
      await cloudDeleteBookmark(existing.id);
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    }
  }, [bookmarks]);

  const saveHighlight = useCallback(async (note: string) => {
    if (!pendingHighlight) return;

    const tempId = crypto.randomUUID();
    const tempHighlight: ReaderHighlight = {
      id: tempId,
      cfi: pendingHighlight.cfi,
      text: pendingHighlight.text,
      note: note.trim(),
      chapter: currentChapter,
      date: new Date().toISOString(),
    };

    setHighlights((prev) => [
      tempHighlight,
      ...prev.filter((highlight) => highlight.cfi !== pendingHighlight.cfi),
    ]);

    setPendingHighlight(null);
    setNoteDraft('');
    setSidebarTab('notes');

    try {
      const saved = await cloudSaveHighlight(bookId, {
        cfi: pendingHighlight.cfi,
        text: pendingHighlight.text,
        note: note.trim(),
        chapter: currentChapter
      });
      setHighlights(prev => prev.map(h => h.id === tempId ? saved : h));
    } catch (err) {
      console.error('Failed to save cloud highlight:', err);
      // Optional: Revert UI or show error
    }
  }, [bookId, currentChapter, pendingHighlight]);

  const removeHighlight = useCallback(async (id: string) => {
    setHighlights((prev) => prev.filter((highlight) => highlight.id !== id));
    try {
      await cloudDeleteHighlight(id);
    } catch (err) {
      console.error('Failed to remove highlight:', err);
    }
  }, []);

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
    recordActivity();
  }, [recordActivity]);
  const jumpTo = useCallback((cfi: string) => {
    readerRef.current?.display(cfi);
    setIsSidebarOpen(false);
    recordActivity();
  }, [recordActivity]);

  const handleDictionary = useCallback(async () => {
    if (!pendingHighlight) return;
    
    setIsDictLoading(true);
    setDictionaryData(null);
    setDictError(null);
    
    try {
      const data = await fetchDefinition(pendingHighlight.text);
      if (data) {
        setDictionaryData(data);
      } else {
        setDictError("Definition not found for this selection.");
      }
    } catch (error) {
      console.error('Dictionary Error:', error);
      setDictError("Failed to fetch definition. Please try again.");
    } finally {
      setIsDictLoading(false);
    }
  }, [pendingHighlight]);

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

  const estimatedMinutesLeft = useMemo(() => {
    const totalSeconds = Number(initialTotalReadingSeconds || 0);
    if (progress > 5 && progress < 100 && totalSeconds > 120) {
      const secondsPerPercent = totalSeconds / progress;
      return Math.max(1, Math.round(((100 - progress) * secondsPerPercent) / 60));
    }

    return Math.max(1, Math.round((100 - progress) / 5));
  }, [initialTotalReadingSeconds, progress]);

  return (
    <div
      className="reader-container transition-colors duration-500"
      onPointerMove={revealControls}
      onPointerDown={revealControls}
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
          onClick={() => {
            recordActivity();
            readerRef.current?.prevPage();
          }}
        />
        <div 
          className="absolute inset-y-0 right-0 w-16 sm:w-24 cursor-pointer pointer-events-auto" 
          onClick={() => {
            recordActivity();
            readerRef.current?.nextPage();
          }}
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
          <AmbiencePopover ambience={ambience} onAmbienceChange={setAmbience} />
          <SettingsPopover
            settings={settings}
            onSettingsChange={handleSettingsChange}
            suggestedColors={palette}
          />
        </div>
      </div>

      {!showControls && (
        <button
          type="button"
          onClick={revealControls}
          className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-text)] shadow-2xl backdrop-blur-xl transition-all hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]"
        >
          <ChevronsUp className="w-4 h-4" />
          Controls
        </button>
      )}

      {/* Main Content */}
      <div className="absolute inset-0 pt-4 pb-4">
        <EpubReaderComponent
          ref={readerRef}
          url={epubUrl}
          initialCfi={initialCfi}
          settings={settings}
          onRelocated={handleRelocated}
          onReady={() => setIsReaderReady(true)}
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

          <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-[var(--theme-border)]">
            <button
              onClick={handleDictionary}
              disabled={isDictLoading}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
            >
              {isDictLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookIcon className="w-3.5 h-3.5" />}
              Dictionary Lookup
            </button>
          </div>

          {(isDictLoading || dictionaryData || dictError) && (
            <div className="mt-4 rounded-lg bg-black/20 p-4 border border-[var(--theme-border)] animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-accent)]">
                  {isDictLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookIcon className="w-3 h-3" />}
                  Dictionary
                </div>
                {(dictionaryData || dictError) && (
                  <button 
                    onClick={() => {
                      setDictionaryData(null);
                      setDictError(null);
                    }}
                    className="p-1 opacity-50 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {dictionaryData ? (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <h4 className="text-lg font-serif font-bold text-[var(--theme-text)]">{dictionaryData.word}</h4>
                    {dictionaryData.phonetic && (
                      <span className="text-xs text-amber-500/60 font-mono italic">{dictionaryData.phonetic}</span>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {dictionaryData.meanings.map((meaning, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/5 pb-1 flex items-center gap-2">
                          {meaning.partOfSpeech}
                        </div>
                        <div className="space-y-3 pl-1">
                          {meaning.definitions.slice(0, 2).map((def, dIdx) => (
                            <div key={dIdx} className="space-y-1">
                              <p className="text-sm leading-relaxed text-[var(--theme-text)] opacity-90">
                                {def.definition}
                              </p>
                              {def.example && (
                                <p className="text-xs italic text-[var(--theme-text)] opacity-40 pl-3 border-l border-white/10">
                                  &quot;{def.example}&quot;
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm leading-relaxed text-[var(--theme-text)] opacity-90">
                  {isDictLoading ? (
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
                      <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
                    </div>
                  ) : (
                    <div className="text-red-400/80">{dictError}</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2 pt-4 border-t border-[var(--theme-border)]">
            <button
              type="button"
              onClick={() => {
                saveHighlight('');
                setDictionaryData(null);
                setDictError(null);
              }}
              className="rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs font-bold uppercase tracking-wider opacity-70 transition-opacity hover:opacity-100"
            >
              Highlight Only
            </button>
            <button
              type="button"
              onClick={() => {
                saveHighlight(noteDraft);
                setDictionaryData(null);
                setDictError(null);
              }}
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
              <span className="text-[var(--theme-accent)]">~{estimatedMinutesLeft} mins left</span>
            </div>
            <span className="text-[var(--theme-accent)]">{progress}%</span>
          </div>
          
          <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden cursor-pointer group/scrub"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percent = x / rect.width;
              recordActivity();
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
              onClick={() => {
                recordActivity();
                readerRef.current?.prevPage();
              }}
              className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] transition-colors"
             >
               <ChevronLeft className="w-6 h-6" />
             </button>
             <button className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] transition-colors">
               <Share2 className="w-5 h-5" />
             </button>
             <button 
              onClick={() => {
                recordActivity();
                readerRef.current?.nextPage();
              }}
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
