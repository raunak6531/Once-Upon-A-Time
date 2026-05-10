'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownNarrowWide,
  BookOpen,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  Heart,
  Library,
  Plus,
  Search,
  Sparkles,
  Timer,
  XCircle,
  Trophy,
  PartyPopper,
} from 'lucide-react';
import type { Book, ReadingSession, ReadingStatus } from '@/types';
import { updateBookOrganization } from '@/lib/readingMetadata';
import confetti from 'canvas-confetti';

interface BookshelfLibraryProps {
  books: Book[];
  sessions: ReadingSession[];
  onUploadClick: () => void;
}

type SortKey = 'recent' | 'title' | 'author' | 'progress';
type StatusFilter = 'all' | ReadingStatus;

const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: 'Want to Read',
  reading: 'Reading',
  finished: 'Finished',
  dnf: 'DNF',
};

const SPINE_PALETTE = [
  '#3b1f4f', '#1f2a4f', '#4f1f2a', '#1f4f3a', '#4f3a1f',
  '#2a1f4f', '#4f2a1f', '#1f4f4a', '#3a1f4f', '#4f1f3a',
];

function spineFor(book: Book): string {
  let h = 0;
  for (let i = 0; i < book.id.length; i++) h = (h * 31 + book.id.charCodeAt(i)) >>> 0;
  return SPINE_PALETTE[h % SPINE_PALETTE.length];
}

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 999 + salt * 137) * 10000;
  return value - Math.floor(value);
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


export default function BookshelfLibrary({ books, sessions, onUploadClick }: BookshelfLibraryProps) {
  const router = useRouter();
  const [libraryBooks, setLibraryBooks] = useState<Book[]>(books);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [activeCover, setActiveCover] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);


  const stats = useMemo(() => {
    const reading = libraryBooks.filter((book) => statusFor(book) === 'reading').length;
    const finished = libraryBooks.filter((book) => statusFor(book) === 'finished').length;
    const totalSeconds = libraryBooks.reduce((sum, book) => sum + Number(book.total_reading_seconds || 0), 0);

    return {
      total: libraryBooks.length,
      reading,
      finished,
      totalSeconds,
      streak: calculateStreak(sessions),
    };
  }, [libraryBooks, sessions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = libraryBooks.filter((book) => {
      const matchesQuery =
        !q ||
        book.title?.toLowerCase().includes(q) ||
        book.author?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || statusFor(book) === statusFilter;
      const matchesFavorite = !favoriteOnly || Boolean(book.is_favorite);

      return matchesQuery && matchesStatus && matchesFavorite;
    });

    if (sort === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else if (sort === 'author') list.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    else if (sort === 'progress') list.sort((a, b) => Number(b.progress_percent || 0) - Number(a.progress_percent || 0));
    else list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return list;
  }, [favoriteOnly, libraryBooks, query, sort, statusFilter]);

  const lastAdded = libraryBooks[0];

  const handleHover = useCallback((cover: string | null) => setActiveCover(cover), []);
  const open = useCallback((id: string) => router.push(`/read/${id}`), [router]);

  const updateBook = useCallback(async (bookId: string, update: Partial<Book>) => {
    const previous = libraryBooks;
    const oldBook = libraryBooks.find(b => b.id === bookId);
    
    setLibraryBooks((current) => current.map((book) => (book.id === bookId ? { ...book, ...update } : book)));

    if (update.reading_status === 'finished' && oldBook?.reading_status !== 'finished') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#ffffff']
      });
    }

    try {
      const saved = await updateBookOrganization(bookId, {
        reading_status: update.reading_status,
        is_favorite: update.is_favorite ?? undefined,
      });
      setLibraryBooks((current) => current.map((book) => (book.id === bookId ? { ...book, ...saved } : book)));
    } catch (error) {
      console.error('Failed to update book organization:', error);
      setLibraryBooks(previous);
    }
  }, [libraryBooks]);

  return (
    <div className="library-page">
      <div className="library-bg" aria-hidden />
      <div
        className={`library-glow${activeCover ? ' is-active' : ''}`}
        style={activeCover ? { backgroundImage: `url(${activeCover})` } : undefined}
        aria-hidden
      />
      <div className="library-vignette" aria-hidden />
      <div className="library-atmosphere" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={`p-${i}`}
            className="library-particle"
            style={{
              left: `${5 + seeded(i, 1) * 90}%`,
              bottom: `-${10 + seeded(i, 2) * 20}px`,
              width: `${3 + seeded(i, 3) * 4}px`,
              height: `${3 + seeded(i, 4) * 4}px`,
              animationDuration: `${14 + seeded(i, 5) * 10}s`,
              animationDelay: `${seeded(i, 6) * 8}s`,
            }}
          />
        ))}
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={`s-${i}`}
            className="library-star"
            style={{
              left: `${seeded(i, 7) * 100}%`,
              top: `${seeded(i, 8) * 100}%`,
              width: `${1 + seeded(i, 9) * 2}px`,
              height: `${1 + seeded(i, 10) * 2}px`,
              animationDuration: `${3 + seeded(i, 11) * 4}s`,
              animationDelay: `${seeded(i, 12) * 5}s`,
            }}
          />
        ))}
      </div>

      <main className="library-main">

        <header className="library-hero">
          <div className="hero-eyebrow">
            <Sparkles className="w-3 h-3" />
            <span>Your private collection</span>
          </div>
          <h1 className="hero-title">My Library</h1>
          <p className="hero-subtitle">&ldquo;A reader lives a thousand lives before he dies.&rdquo;</p>

          <div className="hero-rule" aria-hidden>
            <span className="hero-rule-line" />
            <span className="hero-rule-ornament">✦</span>
            <span className="hero-rule-line" />
          </div>

          <div className="library-stat-inline">
            <StatInlineItem icon={Library} value={stats.total.toString()} label="Volumes" />
            <StatInlineItem icon={BookOpen} value={stats.reading.toString()} label="Reading" />
            <StatInlineItem icon={CheckCircle2} value={stats.finished.toString()} label="Finished" />
            <StatInlineItem icon={Timer} value={formatDuration(stats.totalSeconds)} label="Time Read" />
            <StatInlineItem icon={Flame} value={`${stats.streak}d`} label="Streak" />
            
            <button 
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`heatmap-toggle-btn${showHeatmap ? ' is-active' : ''}`}
            >
              <Timer className="w-3.5 h-3.5" />
              {showHeatmap ? 'Hide Insights' : 'Show Insights'}
            </button>
          </div>

          {showHeatmap && <ReadingHeatmap sessions={sessions} />}

          <div className="hero-meta-row">
            <span className="hero-meta-item">
              <strong>{libraryBooks.length}</strong> {libraryBooks.length === 1 ? 'volume' : 'volumes'}
            </span>
            <span className="hero-meta-sep">·</span>
            <span className="hero-meta-item">
              <strong>{stats.reading}</strong> reading
            </span>
            {lastAdded && (
              <>
                <span className="hero-meta-sep">·</span>
                <span className="hero-meta-item hero-meta-muted">
                  Newest: <em>{lastAdded.title.length > 20 ? lastAdded.title.slice(0, 20) + '...' : lastAdded.title}</em>
                </span>
              </>
            )}
          </div>

          <div className="hero-toolbar">
            <label className="hero-search">
              <Search className="w-4 h-4" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search title or author..."
                aria-label="Search library"
              />
            </label>
            <label className="hero-sort">
              <ArrowDownNarrowWide className="w-4 h-4" />
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="Sort">
                <option value="recent">Newest</option>
                <option value="title">Title A-Z</option>
                <option value="author">Author A-Z</option>
                <option value="progress">Progress</option>
              </select>
            </label>
            <button onClick={onUploadClick} className="btn-3d btn-3d-amber hero-cta-3d" id="upload-book-btn">
              <Plus className="w-4 h-4" /> Add Book
            </button>
          </div>

          <div className="library-filter-panel">
            <div className="library-filter-group" aria-label="Reading status filter">
              <Filter className="w-4 h-4" />
              {(['all', 'reading', 'want_to_read', 'finished', 'dnf'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`library-filter-chip${statusFilter === status ? ' is-active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'All' : STATUS_LABELS[status]}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`library-filter-chip favorite-chip${favoriteOnly ? ' is-active' : ''}`}
              onClick={() => setFavoriteOnly((value) => !value)}
            >
              <Heart className="w-3.5 h-3.5" /> Favorites
            </button>
          </div>
        </header>

        <ContinueReadingHero 
          books={libraryBooks} 
          onOpen={open} 
        />

        {libraryBooks.length === 0 ? (
          <EmptyState onUploadClick={onUploadClick} />
        ) : filtered.length === 0 ? (
          <div className="library-no-results">
            No books match <em>&ldquo;{query || 'these filters'}&rdquo;</em>.
          </div>
        ) : (
          <div className="library-grid">
            {filtered.map((book, i) => (
              <SleekBookCard
                key={book.id}
                book={book}
                index={i}
                onHover={handleHover}
                onOpen={open}
                onUpdate={updateBook}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ContinueReadingHero({ books, onOpen }: { books: Book[]; onOpen: (id: string) => void }) {
  const currentBook = useMemo(() => {
    return [...books]
      .filter(b => statusFor(b) === 'reading')
      .sort((a, b) => {
        const timeA = new Date(a.last_read_at || a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.last_read_at || b.updated_at || b.created_at).getTime();
        return timeB - timeA;
      })[0];
  }, [books]);

  if (!currentBook) return null;

  const progress = Math.round(Number(currentBook.progress_percent || 0));

  return (
    <section className="continue-reading-hero animate-fade-in">
      <div className="continue-reading-cover">
        {currentBook.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentBook.cover_url} alt="" />
        ) : (
          <div className="sleek-book-placeholder">
            <BookOpen className="w-8 h-8" />
          </div>
        )}
      </div>
      <div className="continue-reading-info">
        <div className="continue-reading-label">
          <Sparkles className="w-3 h-3" />
          Continue Reading
        </div>
        <h2 className="continue-reading-title">{currentBook.title}</h2>
        <p className="continue-reading-author">by {currentBook.author || 'Unknown Author'}</p>
        
        <div className="continue-reading-progress">
          <div className="continue-reading-progress-text">
            <span>{progress}% Completed</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>
              Last read {currentBook.last_read_at ? new Date(currentBook.last_read_at).toLocaleDateString() : 'recently'}
            </span>
          </div>
          <div className="continue-reading-progress-bar">
            <div 
              className="continue-reading-progress-fill" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>

        <div className="continue-reading-actions">
          <button 
            onClick={() => onOpen(currentBook.id)}
            className="btn-3d btn-3d-amber"
            style={{ padding: '0.85rem 2.5rem' }}
          >
            <BookOpen className="w-4 h-4" /> Resume Story
          </button>
        </div>
      </div>
    </section>
  );
}

function ReadingHeatmap({ sessions }: { sessions: ReadingSession[] }) {
  const heatmapData = useMemo(() => {
    const data: Record<string, number> = {};
    sessions.forEach(session => {
      const key = localDateKey(session.started_at);
      data[key] = (data[key] || 0) + session.duration_seconds;
    });
    return data;
  }, [sessions]);

  const cells = useMemo(() => {
    const result = [];
    const today = new Date();
    // Show last 6 months (approx 26 weeks)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    // Align to start of week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay());

    for (let i = 0; i < 26 * 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = localDateKey(date);
      const seconds = heatmapData[key] || 0;
      
      // Levels 0-4
      let level = 0;
      if (seconds > 0) {
        if (seconds < 600) level = 1; // < 10m
        else if (seconds < 1800) level = 2; // < 30m
        else if (seconds < 3600) level = 3; // < 1h
        else level = 4;
      }

      result.push({
        date,
        level,
        seconds,
        isFuture: date > today
      });
    }
    return result;
  }, [heatmapData]);

  return (
    <div className="heatmap-container animate-fade-in" style={{ animationDelay: '0.4s' }}>
      <div className="heatmap-header">
        <h3 className="heatmap-title">Reading Consistency</h3>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="heatmap-legend-box" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="heatmap-legend-box" data-level="1" />
          <div className="heatmap-legend-box" data-level="2" />
          <div className="heatmap-legend-box" data-level="3" />
          <div className="heatmap-legend-box" data-level="4" />
          <span>More</span>
        </div>
      </div>
      <div className="heatmap-grid-wrapper">
        <div className="heatmap-grid">
          {cells.map((cell, i) => (
            <div 
              key={i}
              className="heatmap-cell"
              data-level={cell.isFuture ? 0 : cell.level}
              style={cell.isFuture ? { opacity: 0.2, cursor: 'default' } : undefined}
            >
              {!cell.isFuture && (
                <div className="heatmap-tooltip">
                  <strong>{cell.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong>
                  <br />
                  {cell.seconds > 0 ? formatDuration(cell.seconds) : 'No activity'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatInlineItem({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="stat-inline-item">
      <Icon className="w-3.5 h-3.5" />
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: typeof Library; label: string; value: string }) {
  return (
    <span className="library-stat-item">
      <Icon className="w-4 h-4" />
      <span>
        <strong>{value}</strong>
        <em>{label}</em>
      </span>
    </span>
  );
}

function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="library-empty">
      <div className="library-empty-icon">
        <BookOpen className="w-8 h-8" style={{ color: 'rgba(251,191,36,0.7)' }} />
      </div>
      <h2>Your story begins here</h2>
      <p>Upload your first EPUB to start building your personal library.</p>
      <button onClick={onUploadClick} className="btn-3d btn-3d-amber">
        <Plus className="w-4 h-4" /> Add Your First Book
      </button>
    </div>
  );
}

interface CardProps {
  book: Book;
  index: number;
  onHover: (cover: string | null) => void;
  onOpen: (id: string) => void;
  onUpdate: (bookId: string, update: Partial<Book>) => void;
}

function SleekBookCard({ book, index, onHover, onOpen, onUpdate }: CardProps) {
  const reading = statusFor(book) === 'reading';
  const spine = spineFor(book);
  const progress = Math.max(0, Math.min(100, Number(book.progress_percent || 0)));

  return (
    <div
      className="sleek-book-card"
      style={{
        animationDelay: `${Math.min(index, 20) * 40}ms`,
        ['--spine-tint' as string]: spine,
      } as React.CSSProperties}
      onMouseEnter={() => onHover(book.cover_url)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(book.cover_url)}
      onBlur={() => onHover(null)}
    >
      <button
        type="button"
        className="sleek-book-open"
        onClick={() => onOpen(book.id)}
        aria-label={`Open ${book.title}${book.author ? ` by ${book.author}` : ''}`}
      >
        <div className="sleek-book-3d">
          <span className="sleek-book-spine" aria-hidden />
          <div className="sleek-book-front">
            {book.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.cover_url} alt="" />
            ) : (
              <div className="sleek-book-placeholder">
                <BookOpen className="w-7 h-7" />
                <span>{book.title}</span>
              </div>
            )}
            <span className="sleek-book-gloss" aria-hidden />
          </div>
          {reading && <span className="sleek-book-bookmark" aria-hidden />}
        </div>
        <div className="sleek-book-shadow" aria-hidden />
      </button>

      <div className="sleek-book-meta">
        <div className="sleek-book-title-row">
          <h3 className="sleek-book-title">{book.title}</h3>
          <button
            type="button"
            className={`book-favorite-btn${book.is_favorite ? ' is-active' : ''}`}
            onClick={() => onUpdate(book.id, { is_favorite: !book.is_favorite })}
            aria-label={book.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>
        {book.author && <p className="sleek-book-author">{book.author}</p>}
        <div className="book-card-controls">
          <div className="status-picker">
            <button
              type="button"
              className={`status-btn${statusFor(book) === 'want_to_read' ? ' is-active' : ''}`}
              onClick={() => onUpdate(book.id, { reading_status: 'want_to_read' })}
              title="Want to Read"
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              type="button"
              className={`status-btn${statusFor(book) === 'reading' ? ' is-active' : ''}`}
              onClick={() => onUpdate(book.id, { reading_status: 'reading' })}
              title="Currently Reading"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              type="button"
              className={`status-btn${statusFor(book) === 'finished' ? ' is-active' : ''}`}
              onClick={() => onUpdate(book.id, { reading_status: 'finished' })}
              title="Mark as Finished"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              className={`status-btn${statusFor(book) === 'dnf' ? ' is-active' : ''}`}
              onClick={() => onUpdate(book.id, { reading_status: 'dnf' })}
              title="DNF (Did Not Finish)"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <span className="sleek-book-status">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
