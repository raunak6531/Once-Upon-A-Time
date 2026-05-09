'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Search, ArrowDownNarrowWide, Sparkles, Library, Clock } from 'lucide-react';
import type { Book } from '@/types';

interface BookshelfLibraryProps {
  books: Book[];
  onUploadClick: () => void;
}

type SortKey = 'recent' | 'title' | 'author';

const SPINE_PALETTE = [
  '#3b1f4f', '#1f2a4f', '#4f1f2a', '#1f4f3a', '#4f3a1f',
  '#2a1f4f', '#4f2a1f', '#1f4f4a', '#3a1f4f', '#4f1f3a',
];
function spineFor(book: Book): string {
  let h = 0;
  for (let i = 0; i < book.id.length; i++) h = (h * 31 + book.id.charCodeAt(i)) >>> 0;
  return SPINE_PALETTE[h % SPINE_PALETTE.length];
}

export default function BookshelfLibrary({ books, onUploadClick }: BookshelfLibraryProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [activeCover, setActiveCover] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? books.filter(b => b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q))
      : [...books];
    if (sort === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else if (sort === 'author') list.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    else list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return list;
  }, [books, query, sort]);

  const inProgress = useMemo(() => books.filter(b => b.current_cfi).length, [books]);
  const lastAdded = books[0];

  const handleHover = useCallback((cover: string | null) => setActiveCover(cover), []);
  const open = useCallback((id: string) => router.push(`/read/${id}`), [router]);

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
        {mounted && Array.from({ length: 12 }).map((_, i) => (
          <span
            key={`p-${i}`}
            className="library-particle"
            style={{
              left: `${5 + Math.random() * 90}%`,
              bottom: `-${10 + Math.random() * 20}px`,
              width: `${3 + Math.random() * 4}px`,
              height: `${3 + Math.random() * 4}px`,
              animationDuration: `${14 + Math.random() * 10}s`,
              animationDelay: `${Math.random() * 8}s`,
            }}
          />
        ))}
        {mounted && Array.from({ length: 24 }).map((_, i) => (
          <span
            key={`s-${i}`}
            className="library-star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 5}s`,
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

          <div className="hero-meta">
            <span className="hero-meta-item">
              <Library className="w-3.5 h-3.5" />
              <strong>{books.length}</strong> {books.length === 1 ? 'volume' : 'volumes'}
            </span>
            <span className="hero-meta-sep">·</span>
            <span className="hero-meta-item">
              <BookOpen className="w-3.5 h-3.5" />
              <strong>{inProgress}</strong> in progress
            </span>
            {lastAdded && (
              <>
                <span className="hero-meta-sep">·</span>
                <span className="hero-meta-item hero-meta-muted">
                  <Clock className="w-3.5 h-3.5" />
                  Last added <em>{lastAdded.title.length > 24 ? lastAdded.title.slice(0, 24) + '…' : lastAdded.title}</em>
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
                placeholder="Search title or author…"
                aria-label="Search library"
              />
            </label>
            <label className="hero-sort">
              <ArrowDownNarrowWide className="w-4 h-4" />
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="Sort">
                <option value="recent">Newest</option>
                <option value="title">Title A–Z</option>
                <option value="author">Author A–Z</option>
              </select>
            </label>
            <button onClick={onUploadClick} className="btn-3d btn-3d-amber hero-cta-3d" id="upload-book-btn">
              <Plus className="w-4 h-4" /> Add Book
            </button>
          </div>
        </header>

        {books.length === 0 ? (
          <EmptyState onUploadClick={onUploadClick} />
        ) : filtered.length === 0 ? (
          <div className="library-no-results">
            No books match <em>&ldquo;{query}&rdquo;</em>.
          </div>
        ) : (
          <div className="library-grid">
            {filtered.map((book, i) => (
              <SleekBookCard key={book.id} book={book} index={i} onHover={handleHover} onOpen={open} />
            ))}
          </div>
        )}
      </main>
    </div>
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
}

function SleekBookCard({ book, index, onHover, onOpen }: CardProps) {
  const reading = !!book.current_cfi;
  const spine = spineFor(book);

  return (
    <button
      type="button"
      className="sleek-book-card"
      style={{
        animationDelay: `${Math.min(index, 20) * 40}ms`,
        ['--spine-tint' as string]: spine,
      } as React.CSSProperties}
      onMouseEnter={() => onHover(book.cover_url)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(book.cover_url)}
      onBlur={() => onHover(null)}
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

      <div className="sleek-book-meta">
        <h3 className="sleek-book-title">{book.title}</h3>
        {book.author && <p className="sleek-book-author">{book.author}</p>}
        {reading && <span className="sleek-book-status">Continue Reading</span>}
      </div>
    </button>
  );
}
