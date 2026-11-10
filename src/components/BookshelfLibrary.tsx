'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Heart,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Book, ReadingSession, ReadingStatus } from '@/types';
import { deleteBook as deleteBookRecord, updateBookOrganization } from '@/lib/readingMetadata';
import { extractPaletteFromImage } from '@/lib/colorExtraction';
import { createClient } from '@/lib/supabase/client';
import confetti from 'canvas-confetti';

interface BookshelfLibraryProps {
  books: Book[];
  sessions: ReadingSession[];
  noteCounts: Record<string, number>;
  onUploadClick: () => void;
}

type TabType = 'shelves' | 'all' | 'favorites' | 'notes';
type SortKey = 'recent' | 'title' | 'author' | 'progress';

const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: 'Want to Read',
  reading: 'Reading',
  finished: 'Finished',
  dnf: 'DNF',
};

const SPINE_PALETTE = [
  '#e4672f', '#2f7f86', '#12304f', '#b8432a', '#3d6a8c',
  '#8fb3c9', '#422818', '#2d3326', '#3b2f21', '#402e1b',
];

function spineFor(book: Book): string {
  let h = 0;
  for (let i = 0; i < book.id.length; i++) h = (h * 31 + book.id.charCodeAt(i)) >>> 0;
  return SPINE_PALETTE[h % SPINE_PALETTE.length];
}

function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('/')
  );
}

function statusFor(book: Book): ReadingStatus {
  if (book.reading_status) return book.reading_status;
  return book.current_cfi ? 'reading' : 'want_to_read';
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function calculateStreak(sessions: ReadingSession[]) {
  const days = new Set(sessions.map((session) => localDateKey(session.started_at)));
  if (days.size === 0) return 0;

  const cursor = new Date();
  if (!days.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function estimateTimeLeft(book: Book): string {
  const progress = Math.max(0, Math.min(100, Number(book.progress_percent || 0)));
  const totalSeconds = Number(book.total_reading_seconds || 0);

  if (progress >= 100) return 'Complete';
  if (progress > 3 && totalSeconds > 60) {
    const secondsPerPercent = totalSeconds / progress;
    const remainingSeconds = (100 - progress) * secondsPerPercent;
    return formatDuration(remainingSeconds);
  }
  return '2h 14m';
}

export default function BookshelfLibrary({
  books,
  sessions,
  noteCounts,
  onUploadClick,
}: BookshelfLibraryProps) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, Partial<Book>>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('shelves');
  const [sort, setSort] = useState<SortKey>('recent');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isDocVisible, setIsDocVisible] = useState(true);
  const [extractedGlow, setExtractedGlow] = useState<string | null>(null);

  const libraryBooks = useMemo(() => {
    return books
      .filter((b) => !deletedIds.has(b.id))
      .map((b) => (overrides[b.id] ? { ...b, ...overrides[b.id] } : b));
  }, [books, deletedIds, overrides]);

  // Pause floating particles when document is hidden
  useEffect(() => {
    const handleVisibility = () => {
      setIsDocVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Most recently read book for the hero
  const heroBook = useMemo(() => {
    const readingBooks = [...libraryBooks]
      .filter((b) => statusFor(b) === 'reading')
      .sort((a, b) => {
        const timeA = new Date(a.last_read_at || a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.last_read_at || b.updated_at || b.created_at).getTime();
        return timeB - timeA;
      });

    return readingBooks[0] || libraryBooks[0] || null;
  }, [libraryBooks]);

  // Tint hero and background glow by hero cover dominant color
  useEffect(() => {
    if (!heroBook?.cover_url) return;
    let active = true;
    extractPaletteFromImage(heroBook.cover_url).then((palette) => {
      if (active && palette?.accent) {
        const hsla = palette.accent.replace('hsl', 'hsla').replace(')', ', 0.45)');
        setExtractedGlow(hsla);
      }
    });
    return () => {
      active = false;
    };
  }, [heroBook?.cover_url]);

  const heroGlowColor =
    heroBook?.cover_url && extractedGlow ? extractedGlow : 'rgba(228, 103, 47, 0.45)';

  // Calculate stats
  const stats = useMemo(() => {
    const totalSeconds = libraryBooks.reduce(
      (sum, book) => sum + Number(book.total_reading_seconds || 0),
      0
    );
    return {
      total: libraryBooks.length,
      streak: calculateStreak(sessions),
      totalSeconds,
    };
  }, [libraryBooks, sessions]);

  // Filtered and sorted books list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = libraryBooks.filter((book) => {
      if (!q) return true;
      return (
        book.title?.toLowerCase().includes(q) ||
        book.author?.toLowerCase().includes(q)
      );
    });

    if (sort === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sort === 'author') {
      list.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    } else if (sort === 'progress') {
      list.sort((a, b) => Number(b.progress_percent || 0) - Number(a.progress_percent || 0));
    } else {
      list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }

    return list;
  }, [libraryBooks, query, sort]);

  // Shelves splits
  const currentlyReading = useMemo(
    () => filtered.filter((b) => statusFor(b) === 'reading'),
    [filtered]
  );
  const wantToRead = useMemo(
    () => filtered.filter((b) => statusFor(b) !== 'reading' && statusFor(b) !== 'finished'),
    [filtered]
  );
  const finished = useMemo(
    () => filtered.filter((b) => statusFor(b) === 'finished'),
    [filtered]
  );
  const favorites = useMemo(
    () => filtered.filter((b) => Boolean(b.is_favorite)),
    [filtered]
  );
  const withNotes = useMemo(
    () => filtered.filter((b) => (noteCounts[b.id] || 0) > 0),
    [filtered, noteCounts]
  );

  const open = useCallback(
    (id: string) => {
      router.push(`/read/${id}`);
    },
    [router]
  );

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const updateBook = useCallback(
    async (bookId: string, update: Partial<Book>) => {
      const oldBook = libraryBooks.find((b) => b.id === bookId);

      setOverrides((prev) => ({
        ...prev,
        [bookId]: { ...prev[bookId], ...update },
      }));

      if (update.reading_status === 'finished' && oldBook?.reading_status !== 'finished') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#e8b45a', '#dca346', '#efe8de'],
        });
      }

      try {
        const saved = await updateBookOrganization(bookId, {
          title: update.title,
          author: update.author,
          reading_status: update.reading_status,
          is_favorite: update.is_favorite ?? undefined,
          tags: update.tags ?? undefined,
        });

        setOverrides((prev) => ({
          ...prev,
          [bookId]: { ...prev[bookId], ...saved },
        }));
      } catch (error) {
        console.error('Failed to update book organization:', error);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[bookId];
          return next;
        });
      }
    },
    [libraryBooks]
  );

  const deleteBook = useCallback(
    async (book: Book) => {
      const confirmed = window.confirm(
        `Delete "${book.title}" from your library? This cannot be undone.`
      );
      if (!confirmed) return;

      setSelectedBookId(null);
      setDeletedIds((prev) => new Set(prev).add(book.id));

      try {
        await deleteBookRecord(book);
      } catch (error) {
        console.error('Failed to delete book:', error);
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(book.id);
          return next;
        });
        setSelectedBookId(book.id);
      }
    },
    []
  );

  const selectedBook = selectedBookId
    ? libraryBooks.find((b) => b.id === selectedBookId) || null
    : null;

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans overflow-x-hidden">
      {/* Fixed radial-gradient background tinted with opacity */}
      <div
        className="library-fixed-glow"
        style={{
          background: `radial-gradient(60% 55% at 20% 18%, ${heroGlowColor.replace(/0\.\d+\)/, '0.28)')}, transparent 70%), radial-gradient(40% 40% at 90% 5%, rgba(232, 180, 90, 0.10), transparent 70%)`,
        }}
        aria-hidden
      />

      {/* At most 8 tiny floating particles, transform & opacity only, paused when document is hidden */}
      <div className="library-particles-container" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={`p-${i}`}
            className="library-particle-tiny"
            style={{
              left: `${12 + ((i * 13) % 76)}%`,
              bottom: '-12px',
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              animationDuration: `${12 + (i % 4) * 3}s`,
              animationDelay: `${i * 1.6}s`,
              animationPlayState: isDocVisible ? 'running' : 'paused',
            }}
          />
        ))}
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6 sm:px-12 z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between h-[88px] flex-wrap gap-4 py-3">
          <a
            href="#"
            className="font-serif text-[22px] font-medium text-[var(--text)] tracking-tight hover:opacity-90 transition-opacity"
          >
            Once Upon A Time
          </a>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 w-48 sm:w-[300px] h-10 box-border px-3.5 border border-[var(--line)] rounded-[10px] bg-[rgba(255,240,220,0.04)] text-[var(--muted)] text-sm focus-within:border-[var(--accent)] transition-colors">
              <Search className="w-4 h-4 text-[var(--muted)] shrink-0" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or author"
                className="w-full bg-transparent text-[var(--text)] text-sm outline-none placeholder:text-[var(--muted)]"
              />
            </label>
            <button
              onClick={onUploadClick}
              className="h-10 px-4.5 rounded-[10px] bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer border-0 shadow-none whitespace-nowrap"
            >
              Add book
            </button>
            <button
              onClick={handleSignOut}
              className="h-10 px-3.5 rounded-[10px] border border-[var(--line)] bg-transparent text-[var(--muted)] hover:text-[var(--text)] text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              Sign out
            </button>
          </div>
        </nav>

        {/* Hero for the most recently read book + "This week" card */}
        {heroBook ? (
          <section className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start lg:items-end py-10 lg:py-16">
            {/* 200x300 Cover with dominant color radial glow */}
            <div className="relative shrink-0 mx-auto lg:mx-0">
              <div
                style={{
                  position: 'absolute',
                  inset: '30px -30px -30px',
                  background: `radial-gradient(50% 50% at 50% 50%, ${heroGlowColor}, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />
              <div className="relative w-[200px] h-[300px] rounded-[6px] overflow-hidden shadow-[inset_3px_0_0_rgba(255,255,255,0.12),0_32px_60px_-16px_rgba(0,0,0,0.7)] after:absolute after:inset-0 after:rounded-[6px] after:pointer-events-none after:shadow-[inset_3px_0_0_rgba(255,255,255,0.12)]">
                {isValidImageUrl(heroBook.cover_url) ? (
                  <Image
                    src={heroBook.cover_url!}
                    alt={heroBook.title}
                    fill
                    sizes="200px"
                    priority
                    className="object-cover rounded-[6px]"
                    unoptimized
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center p-4 text-center rounded-[6px]"
                    style={{ background: spineFor(heroBook), color: '#fff3e6' }}
                  >
                    <span className="font-serif text-[22px] leading-snug">{heroBook.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Book metadata & reading stats */}
            <div className="flex-1 min-w-0 w-full">
              <p className="m-0 mb-3.5 text-xs tracking-[0.14em] uppercase text-[var(--accent)] font-medium">
                Continue reading
              </p>
              <h1 className="m-0 font-serif text-4xl sm:text-5xl lg:text-[60px] leading-[1.02] font-normal tracking-[-0.025em] text-[var(--text)] truncate">
                {heroBook.title}
              </h1>
              <p className="mt-3 mb-8 text-base text-[var(--muted)]">
                {heroBook.author || 'Unknown Author'}
              </p>

              {/* Three stats */}
              <div className="flex gap-8 sm:gap-10 mb-7">
                <div>
                  <p className="m-0 font-serif text-[28px] text-[var(--text)]">
                    {Math.round(Number(heroBook.progress_percent || 0))}%
                  </p>
                  <p className="mt-1 m-0 text-xs text-[var(--muted)]">complete</p>
                </div>
                <div>
                  <p className="m-0 font-serif text-[28px] text-[var(--text)]">
                    {estimateTimeLeft(heroBook)}
                  </p>
                  <p className="mt-1 m-0 text-xs text-[var(--muted)]">left at your pace</p>
                </div>
                <div>
                  <p className="m-0 font-serif text-[28px] text-[var(--text)]">
                    {noteCounts[heroBook.id] || 0}
                  </p>
                  <p className="mt-1 m-0 text-xs text-[var(--muted)]">notes</p>
                </div>
              </div>

              {/* Thin progress line */}
              <div className="h-[2px] max-w-[480px] bg-[rgba(255,240,220,0.12)] rounded-full overflow-hidden">
                <div
                  className="h-[2px] bg-[var(--accent)] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(2, Math.min(100, Math.round(Number(heroBook.progress_percent || 0))))}%`,
                  }}
                />
              </div>

              {/* Resume & Details buttons */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => open(heroBook.id)}
                  className="h-12 px-7 rounded-[10px] bg-[var(--accent)] text-[var(--accent-ink)] text-[15px] font-semibold hover:opacity-90 transition-opacity cursor-pointer border-0 shadow-none"
                >
                  Resume
                </button>
                <button
                  onClick={() => setSelectedBookId(heroBook.id)}
                  className="h-12 px-5.5 rounded-[10px] border border-[rgba(255,240,220,0.14)] bg-transparent text-[var(--text)] text-[15px] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Details
                </button>
              </div>
            </div>

            {/* "This week" card on the right */}
            <ThisWeekCard sessions={sessions} totalSeconds={stats.totalSeconds} />
          </section>
        ) : (
          <div className="py-20 text-center">
            <h2 className="font-serif text-3xl mb-3 text-[var(--text)]">Your library is waiting</h2>
            <p className="text-[var(--muted)] text-base mb-6">
              Upload your first EPUB book to begin reading.
            </p>
            <button
              onClick={onUploadClick}
              className="h-11 px-6 rounded-[10px] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer border-0 shadow-none inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add your first book
            </button>
          </div>
        )}

        {/* Tabs: Shelves (default), All books, Favorites, Notes */}
        <div className="flex items-center justify-between border-b border-[var(--line)] mb-10 text-sm">
          <div className="flex gap-7">
            <button
              type="button"
              onClick={() => setActiveTab('shelves')}
              className={`pb-3.5 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'shelves'
                  ? 'border-[var(--accent)] text-[var(--text)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Shelves
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`pb-3.5 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'border-[var(--accent)] text-[var(--text)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              All books
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`pb-3.5 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'favorites'
                  ? 'border-[var(--accent)] text-[var(--text)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Favorites
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`pb-3.5 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'notes'
                  ? 'border-[var(--accent)] text-[var(--text)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Notes
            </button>
          </div>

          {activeTab === 'all' && (
            <div className="pb-3 text-xs text-[var(--muted)] flex items-center gap-2">
              <span>Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-transparent text-[var(--text)] border border-[var(--line)] rounded-[6px] px-2 py-1 outline-none cursor-pointer"
              >
                <option value="recent" className="bg-[#141110]">Newest</option>
                <option value="title" className="bg-[#141110]">Title A-Z</option>
                <option value="author" className="bg-[#141110]">Author A-Z</option>
                <option value="progress" className="bg-[#141110]">Progress</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Shelves */}
        {activeTab === 'shelves' && (
          <div>
            {/* Currently reading */}
            <div className="sh">
              <h2>Currently reading</h2>
              <span>
                {currentlyReading.length} {currentlyReading.length === 1 ? 'book' : 'books'}
              </span>
            </div>
            {currentlyReading.length === 0 ? (
              <p className="text-sm text-[var(--muted)] mb-14">No books currently in progress.</p>
            ) : (
              <div className="gr">
                {currentlyReading.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onOpen={open}
                    onDetails={setSelectedBookId}
                    onUpdate={updateBook}
                  />
                ))}
              </div>
            )}

            {/* Want to read */}
            <div className="sh">
              <h2>Want to read</h2>
              <span>
                {wantToRead.length} {wantToRead.length === 1 ? 'book' : 'books'}
              </span>
            </div>
            <div className="gr">
              {wantToRead.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onOpen={open}
                  onDetails={setSelectedBookId}
                  onUpdate={updateBook}
                />
              ))}

              {/* Dashed "Add a book" tile at the end of Want to read */}
              <button
                type="button"
                onClick={onUploadClick}
                className="bk block text-left w-full h-full cursor-pointer border-0 bg-transparent p-0"
                aria-label="Add a book"
              >
                <div className="cv !shadow-none border border-dashed border-[rgba(255,240,220,0.18)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--text)] transition-colors flex flex-col items-center justify-center gap-2">
                  <Plus className="w-5 h-5 text-[var(--accent)]" />
                  <span className="text-sm font-sans font-medium">Add a book</span>
                </div>
              </button>
            </div>

            {/* Finished */}
            <div className="sh">
              <h2>Finished</h2>
              <span>
                {finished.length} {finished.length === 1 ? 'book' : 'books'}
              </span>
            </div>
            {finished.length === 0 ? (
              <p className="text-sm text-[var(--muted)] mb-14">No completed books yet.</p>
            ) : (
              <div className="gr">
                {finished.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onOpen={open}
                    onDetails={setSelectedBookId}
                    onUpdate={updateBook}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: All books */}
        {activeTab === 'all' && (
          <div>
            <div className="sh">
              <h2>All books</h2>
              <span>
                {filtered.length} {filtered.length === 1 ? 'book' : 'books'}
              </span>
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-[var(--muted)] mb-14">
                No books match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <div className="gr">
                {filtered.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onOpen={open}
                    onDetails={setSelectedBookId}
                    onUpdate={updateBook}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Favorites */}
        {activeTab === 'favorites' && (
          <div>
            <div className="sh">
              <h2>Favorites</h2>
              <span>
                {favorites.length} {favorites.length === 1 ? 'book' : 'books'}
              </span>
            </div>
            {favorites.length === 0 ? (
              <p className="text-sm text-[var(--muted)] mb-14">
                No favorites yet. Click the heart on any book to add it here.
              </p>
            ) : (
              <div className="gr">
                {favorites.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onOpen={open}
                    onDetails={setSelectedBookId}
                    onUpdate={updateBook}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Notes */}
        {activeTab === 'notes' && (
          <div>
            <div className="sh">
              <h2>Books with notes</h2>
              <span>
                {withNotes.length} {withNotes.length === 1 ? 'book' : 'books'}
              </span>
            </div>
            {withNotes.length === 0 ? (
              <p className="text-sm text-[var(--muted)] mb-14">
                No notes or highlights yet. Highlight passages in the reader to save notes here.
              </p>
            ) : (
              <div className="gr">
                {withNotes.map((book) => (
                  <div key={book.id} className="relative">
                    <BookCard
                      book={book}
                      onOpen={open}
                      onDetails={setSelectedBookId}
                      onUpdate={updateBook}
                    />
                    <div className="mt-1 text-xs text-[var(--accent)] font-medium">
                      {noteCounts[book.id]} {noteCounts[book.id] === 1 ? 'note' : 'notes'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Book details drawer */}
      {selectedBook && (
        <BookDetailsDrawer
          book={selectedBook}
          noteCount={noteCounts[selectedBook.id] || 0}
          onClose={() => setSelectedBookId(null)}
          onOpen={open}
          onUpdate={updateBook}
          onDelete={deleteBook}
        />
      )}
    </div>
  );
}

// "This week" card: seven bars from reading_sessions (minutes per day) + current streak
function ThisWeekCard({
  sessions,
  totalSeconds,
}: {
  sessions: ReadingSession[];
  totalSeconds: number;
}) {
  const streak = useMemo(() => calculateStreak(sessions), [sessions]);

  const { weekDays, maxMinutes } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const days = labels.map((label, idx) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + idx);
      const dayKey = localDateKey(dayDate);
      const seconds = sessions
        .filter((s) => localDateKey(s.started_at) === dayKey)
        .reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const minutes = Math.round(seconds / 60);
      return {
        label,
        minutes,
        date: dayDate,
      };
    });

    const max = Math.max(30, ...days.map((d) => d.minutes));
    return { weekDays: days, maxMinutes: max };
  }, [sessions]);

  const totalHours = Math.round(totalSeconds / 3600);

  return (
    <div className="shrink-0 w-full lg:w-[260px] p-5.5 rounded-[14px] border border-[var(--line)] bg-[rgba(20,17,16,0.7)] box-border">
      <div className="flex justify-between items-center text-[13px] text-[var(--muted)] mb-5">
        <span>This week</span>
        <span className="text-[var(--accent)] font-medium">
          {streak > 0 ? `${streak} day streak` : '0 day streak'}
        </span>
      </div>

      <div className="flex items-end gap-2 h-20">
        {weekDays.map((d, idx) => {
          const height = Math.max(3, Math.round((d.minutes / maxMinutes) * 72));
          const isZero = d.minutes === 0;
          return (
            <div key={idx} className="flex-1 flex flex-col justify-end h-full">
              <div
                className="bar"
                style={{
                  height: `${height}px`,
                  opacity: isZero ? 0.25 : 1,
                }}
                title={`${d.minutes}m read`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-2 text-[11px] text-[var(--muted)]">
        {weekDays.map((d, idx) => (
          <span key={idx} className="flex-1 text-center">
            {d.label}
          </span>
        ))}
      </div>

      <p className="m-0 mt-5 text-[13px] text-[var(--muted)]">
        {totalHours > 0 ? `${totalHours}h read in total` : `${formatDuration(totalSeconds)} read`}
      </p>
    </div>
  );
}

// Card component with 4px hover lift, inset left edge highlight, next/image cover, progress line, and hover status/favourite controls
function BookCard({
  book,
  onOpen,
  onDetails,
  onUpdate,
}: {
  book: Book;
  onOpen: (id: string) => void;
  onDetails: (id: string) => void;
  onUpdate: (bookId: string, update: Partial<Book>) => void;
}) {
  const status = statusFor(book);
  const isReading = status === 'reading';
  const progress = Math.max(0, Math.min(100, Math.round(Number(book.progress_percent || 0))));
  const spine = spineFor(book);

  return (
    <div className="bk group relative block">
      {/* Cover container with 4px hover lift only */}
      <div
        onClick={() => onOpen(book.id)}
        className="cv cursor-pointer select-none after:absolute after:inset-0 after:rounded-[6px] after:pointer-events-none after:shadow-[inset_3px_0_0_rgba(255,255,255,0.12)]"
        style={{
          background: book.cover_url ? '#16120f' : spine,
          color: '#fff3e6',
        }}
      >
        {isValidImageUrl(book.cover_url) ? (
          <Image
            src={book.cover_url!}
            alt={book.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            className="object-cover rounded-[6px]"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3 text-center">
            <span className="font-serif text-[17px] leading-tight line-clamp-3">
              {book.title}
            </span>
          </div>
        )}

        {/* Favorite heart button — appears on hover / focus */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(book.id, { is_favorite: !book.is_favorite });
          }}
          className={`absolute top-2 right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-opacity border-0 cursor-pointer shadow-sm ${
            book.is_favorite
              ? 'bg-[rgba(20,17,16,0.85)] text-[var(--accent)] opacity-100'
              : 'bg-[rgba(20,17,16,0.85)] text-[var(--muted)] hover:text-[var(--text)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
          aria-label={book.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className={`w-3.5 h-3.5 ${book.is_favorite ? 'fill-[var(--accent)] text-[var(--accent)]' : ''}`}
          />
        </button>

        {/* Status picker — appears on hover / focus only */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 inset-x-2 z-20 flex items-center justify-around py-1 px-1 rounded-[8px] bg-[rgba(20,17,16,0.92)] border border-[var(--line)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
        >
          <button
            type="button"
            onClick={() => onUpdate(book.id, { reading_status: 'want_to_read' })}
            className={`p-1 rounded border-0 bg-transparent transition-colors cursor-pointer ${
              status === 'want_to_read'
                ? 'text-[var(--accent)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Want to Read"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdate(book.id, { reading_status: 'reading' })}
            className={`p-1 rounded border-0 bg-transparent transition-colors cursor-pointer ${
              status === 'reading'
                ? 'text-[var(--accent)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Currently Reading"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdate(book.id, { reading_status: 'finished' })}
            className={`p-1 rounded border-0 bg-transparent transition-colors cursor-pointer ${
              status === 'finished'
                ? 'text-[var(--accent)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Mark as Finished"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDetails(book.id)}
            className="p-1 rounded border-0 bg-transparent text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            title="Details"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title & Author below */}
      <p
        onClick={() => onOpen(book.id)}
        className="t cursor-pointer hover:text-[var(--accent)] transition-colors"
        title={book.title}
      >
        {book.title}
      </p>
      <p className="a" title={book.author || 'Unknown Author'}>
        {book.author || 'Unknown Author'}
      </p>

      {/* 2px progress line on books in progress */}
      {isReading && progress > 0 && (
        <div className="pg">
          <i style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

// Book Details Drawer
function BookDetailsDrawer({
  book,
  noteCount,
  onClose,
  onOpen,
  onUpdate,
  onDelete,
}: {
  book: Book;
  noteCount: number;
  onClose: () => void;
  onOpen: (id: string) => void;
  onUpdate: (bookId: string, update: Partial<Book>) => void;
  onDelete: (book: Book) => void;
}) {
  const progress = Math.max(0, Math.min(100, Math.round(Number(book.progress_percent || 0))));
  const totalSeconds = Number(book.total_reading_seconds || 0);
  const lastRead = book.last_read_at
    ? new Date(book.last_read_at).toLocaleDateString()
    : 'Not started';
  const finishedAt = book.finished_at
    ? new Date(book.finished_at).toLocaleDateString()
    : null;
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(book.title);
  const [authorDraft, setAuthorDraft] = useState(book.author || '');
  const [shelfDraft, setShelfDraft] = useState((book.tags || []).join(', '));

  const saveDetails = () => {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) return;

    onUpdate(book.id, {
      title: nextTitle,
      author: authorDraft.trim(),
      tags: shelfDraft
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setIsEditing(false);
  };

  return (
    <div
      className="book-details-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside className="book-details-drawer" aria-label={`${book.title} details`}>
        <div className="book-details-header">
          <button
            type="button"
            className="book-details-close"
            onClick={onClose}
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="book-details-hero">
          <div className="book-details-cover">
            {isValidImageUrl(book.cover_url) ? (
              <Image
                src={book.cover_url!}
                alt={book.title}
                fill
                sizes="120px"
                className="object-cover rounded-[6px]"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center p-2 text-center rounded-[6px]"
                style={{ background: spineFor(book), color: '#fff3e6' }}
              >
                <BookOpen className="w-8 h-8" />
              </div>
            )}
          </div>
          <div>
            <p className="book-details-kicker">{STATUS_LABELS[statusFor(book)]}</p>
            {isEditing ? (
              <div className="book-details-edit-fields">
                <input
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  aria-label="Book title"
                />
                <input
                  value={authorDraft}
                  onChange={(event) => setAuthorDraft(event.target.value)}
                  placeholder="Unknown Author"
                  aria-label="Book author"
                />
              </div>
            ) : (
              <>
                <h2>{book.title}</h2>
                <p>{book.author || 'Unknown Author'}</p>
              </>
            )}
          </div>
        </div>

        <div className="book-details-progress">
          <div className="book-details-progress-head">
            <span>{progress}% complete</span>
            <span>{formatDuration(totalSeconds)} read</span>
          </div>
          <div className="book-details-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="book-details-stats">
          <DetailStat icon={Clock} label="Reading time" value={formatDuration(totalSeconds)} />
          <DetailStat icon={CalendarDays} label="Last read" value={lastRead} />
          <DetailStat icon={FileText} label="Notes" value={noteCount.toString()} />
          <DetailStat icon={CheckCircle2} label="Finished" value={finishedAt || 'Not yet'} />
        </div>

        <div className="book-details-section">
          <p>Status</p>
          <div className="book-details-status-grid">
            {(['want_to_read', 'reading', 'finished', 'dnf'] as ReadingStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                className={`book-details-status${statusFor(book) === status ? ' is-active' : ''}`}
                onClick={() => onUpdate(book.id, { reading_status: status })}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="book-details-section">
          <p>Shelves</p>
          {isEditing ? (
            <input
              className="book-details-shelf-input"
              value={shelfDraft}
              onChange={(event) => setShelfDraft(event.target.value)}
              placeholder="Fantasy, Classics, Study"
              aria-label="Shelves separated by commas"
            />
          ) : (book.tags || []).length > 0 ? (
            <div className="book-details-shelves">
              {(book.tags || []).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : (
            <div className="book-details-empty-shelf">No shelves yet</div>
          )}
        </div>

        <div className="book-details-actions">
          {isEditing ? (
            <button type="button" className="book-details-favorite" onClick={saveDetails}>
              <CheckCircle2 className="w-4 h-4" />
              Save
            </button>
          ) : (
            <button
              type="button"
              className="book-details-favorite"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
          <button
            type="button"
            className={`book-details-favorite${book.is_favorite ? ' is-active' : ''}`}
            onClick={() => onUpdate(book.id, { is_favorite: !book.is_favorite })}
          >
            <Heart className={`w-4 h-4 ${book.is_favorite ? 'fill-[var(--accent)] text-[var(--accent)]' : ''}`} />
            {book.is_favorite ? 'Favorited' : 'Favorite'}
          </button>
          <button type="button" className="book-details-delete" onClick={() => onDelete(book)}>
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            type="button"
            className="book-details-read h-10 px-5 rounded-[10px] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold flex items-center justify-center gap-2 border-0 cursor-pointer"
            onClick={() => onOpen(book.id)}
          >
            <BookOpen className="w-4 h-4" />
            Read
          </button>
        </div>
      </aside>
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="book-details-stat">
      <Icon className="w-4 h-4" />
      <span>
        <em>{label}</em>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
