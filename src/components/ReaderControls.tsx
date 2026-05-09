'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, List, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SettingsPopover from './SettingsPopover';
import { useBookProgress } from '@/hooks/useBookProgress';
import type { EpubReaderRef } from './EpubReader';
import type { ReaderSettings } from '@/types';
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
  
  const [settings, setSettings] = useState<ReaderSettings>({
    theme: 'dark',
    fontFamily: 'serif',
    fontSize: 100,
    lineHeight: 'normal',
    margin: 'normal',
    customBg: '#141418',
    customText: '#e2e8f0',
  });

  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'bookmarks'>('toc');
  const [toc, setToc] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<{ id: string; cfi: string; label: string; date: string }[]>([]);
  const [currentChapter, setCurrentChapter] = useState('');
  const [currentCfi, setCurrentCfi] = useState<string | null>(initialCfi);
  const [palette, setPalette] = useState<{ accent: string; tint: string } | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
      setShowControls(true);
      return;
    }

    resetHideTimer();
    const handleTouch = () => resetHideTimer();

    window.addEventListener('touchstart', handleTouch);

    return () => {
      window.removeEventListener('touchstart', handleTouch);
      clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer, isPinned]);

  // Load bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`bookmarks_${bookId}`);
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse bookmarks', e);
      }
    }
  }, [bookId]);

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

  const jumpTo = useCallback((cfi: string) => {
    readerRef.current?.display(cfi);
    setIsSidebarOpen(false);
  }, []);

  const handleSettingsChange = useCallback((newSettings: Partial<ReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

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
        onJump={jumpTo}
        onRemoveBookmark={removeBookmark}
        currentCfi={currentCfi}
        currentChapter={currentChapter}
        activeTab={sidebarTab}
        setActiveTab={setSidebarTab}
      />
      {/* Tap Zones */}
      <div className="absolute inset-0 z-10 flex">
        <div 
          className="w-1/3 h-full cursor-pointer" 
          onClick={() => readerRef.current?.prevPage()}
        />
        <div 
          className="w-1/3 h-full cursor-pointer" 
          onClick={() => setShowControls(!showControls)}
        />
        <div 
          className="w-1/3 h-full cursor-pointer" 
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
            onClick={() => setIsPinned(!isPinned)}
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
        />
      </div>

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
