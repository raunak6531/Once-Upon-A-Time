'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import SettingsPopover from './SettingsPopover';
import { useBookProgress } from '@/hooks/useBookProgress';
import type { EpubReaderRef } from './EpubReader';

// Dynamically import EpubReader with SSR disabled
const EpubReaderComponent = dynamic(() => import('./EpubReader'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'var(--theme-accent)', animation: 'pulse-glow 2s infinite' }}
        >
          <span className="text-white text-lg">📖</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
          Preparing reader...
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
}

export default function ReaderControls({
  bookId,
  bookTitle,
  epubUrl,
  initialCfi,
}: ReaderControlsProps) {
  const router = useRouter();
  const readerRef = useRef<EpubReaderRef>(null);
  const { mode } = useTheme();
  const { saveCfi } = useBookProgress(bookId, initialCfi);
  const [fontSize, setFontSize] = useState(100);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-hide controls after inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    const handleMouseMove = () => resetHideTimer();
    const handleTouch = () => resetHideTimer();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouch);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouch);
      clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  const handleRelocated = useCallback(
    (cfi: string, progressPercent: number) => {
      saveCfi(cfi);
      setProgress(Math.round(progressPercent * 100));
    },
    [saveCfi]
  );

  const handleFontSizeChange = useCallback((size: number) => {
    setFontSize(size);
    readerRef.current?.setFontSize(size);
  }, []);

  return (
    <div
      className="reader-container"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      {/* Top Navigation Bar */}
      <div
        className="absolute top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between transition-all duration-300"
        style={{
          background: showControls
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)'
            : 'transparent',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          backdropFilter: showControls ? 'blur(8px)' : 'none',
        }}
      >
        <button
          id="back-to-library"
          onClick={() => router.push('/library')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'var(--theme-text)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Library
        </button>

        <h2
          className="text-sm font-medium truncate max-w-[200px] sm:max-w-xs"
          style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-serif)' }}
        >
          {bookTitle}
        </h2>

        <SettingsPopover
          fontSize={fontSize}
          onFontSizeChange={handleFontSizeChange}
        />
      </div>

      {/* Navigation Buttons */}
      <button
        id="prev-page-btn"
        className="reader-nav-btn left"
        onClick={() => readerRef.current?.prevPage()}
        style={{
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        id="next-page-btn"
        className="reader-nav-btn right"
        onClick={() => readerRef.current?.nextPage()}
        style={{
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* EPUB Reader */}
      <div className="absolute inset-0 pt-14 pb-10">
        <EpubReaderComponent
          ref={readerRef}
          url={epubUrl}
          initialCfi={initialCfi}
          fontSize={fontSize}
          mode={mode}
          onRelocated={handleRelocated}
        />
      </div>

      {/* Bottom Progress Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-4 py-2 flex items-center gap-3 transition-all duration-300"
        style={{
          background: showControls
            ? 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)'
            : 'transparent',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div className="flex-1 progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span
          className="text-xs font-medium tabular-nums"
          style={{ color: 'var(--theme-text-secondary)', minWidth: '35px', textAlign: 'right' }}
        >
          {progress}%
        </span>
      </div>
    </div>
  );
}
