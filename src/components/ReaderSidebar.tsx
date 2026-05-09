'use client';

import { useEffect, useRef } from 'react';
import { X, Trash2, ChevronRight, Search } from 'lucide-react';
import type { ReaderBookmark, ReaderHighlight, ReaderSearchResult, TocEntry } from '@/types';

interface ReaderSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  toc: TocEntry[];
  bookmarks: ReaderBookmark[];
  highlights: ReaderHighlight[];
  searchQuery: string;
  searchResults: ReaderSearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  searchError: string | null;
  onJump: (cfi: string) => void;
  onRemoveBookmark: (cfi: string) => void;
  onRemoveHighlight: (id: string) => void;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
  onSearchResultClick: (cfi: string) => void;
  currentChapter?: string;
  activeTab: 'toc' | 'bookmarks' | 'notes' | 'search';
  setActiveTab: (tab: 'toc' | 'bookmarks' | 'notes' | 'search') => void;
}

export default function ReaderSidebar({
  isOpen,
  onClose,
  toc,
  bookmarks,
  highlights,
  searchQuery,
  searchResults,
  isSearching,
  hasSearched,
  searchError,
  onJump,
  onRemoveBookmark,
  onRemoveHighlight,
  onSearchQueryChange,
  onSearchSubmit,
  onSearchResultClick,
  currentChapter,
  activeTab,
  setActiveTab,
}: ReaderSidebarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'search') {
      const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 250);
      return () => clearTimeout(focusTimer);
    }
  }, [activeTab, isOpen]);

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-500 ease-out flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{
        background: 'var(--theme-surface)',
        borderRight: '1px solid var(--theme-border)',
        boxShadow: '20px 0 50px rgba(0,0,0,0.5)',
        color: 'var(--theme-text)',
      }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-[var(--theme-border)]">
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('toc')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeTab === 'toc' ? 'text-[var(--theme-accent)]' : 'opacity-40 hover:opacity-100'
            }`}
          >
            Contents
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeTab === 'bookmarks' ? 'text-[var(--theme-accent)]' : 'opacity-40 hover:opacity-100'
            }`}
          >
            Bookmarks
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeTab === 'notes' ? 'text-[var(--theme-accent)]' : 'opacity-40 hover:opacity-100'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeTab === 'search' ? 'text-[var(--theme-accent)]' : 'opacity-40 hover:opacity-100'
            }`}
          >
            Search
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors opacity-50 hover:opacity-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        {activeTab === 'toc' ? (
          <div className="space-y-1">
            {toc.map((item, index) => (
              <TocItem 
                key={index} 
                item={item} 
                onJump={onJump} 
                depth={0} 
                currentChapter={currentChapter}
              />
            ))}
          </div>
        ) : activeTab === 'bookmarks' ? (
          <div className="space-y-4">
            {bookmarks.length === 0 ? (
              <div className="py-12 text-center opacity-40 italic text-sm">
                No bookmarks yet...
              </div>
            ) : (
              bookmarks.map((b) => (
                <div
                  key={b.cfi}
                  className="group relative p-4 rounded-xl border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/30 bg-white/5 transition-all duration-300"
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => onJump(b.cfi)}
                  >
                    <div className="text-xs font-serif font-bold mb-1 group-hover:text-[var(--theme-accent)] transition-colors">
                      {b.label}
                    </div>
                    <div className="text-[10px] opacity-40 uppercase tracking-tighter">
                      {new Date(b.date).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveBookmark(b.cfi)}
                    className="absolute top-4 right-4 p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'notes' ? (
          <div className="space-y-4">
            {highlights.length === 0 ? (
              <div className="py-12 text-center opacity-40 italic text-sm">
                Select text in the book to add highlights and notes.
              </div>
            ) : (
              highlights.map((highlight) => (
                <div
                  key={highlight.id}
                  className="group relative p-4 rounded-xl border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/30 bg-white/5 transition-all duration-300"
                >
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => onJump(highlight.cfi)}
                  >
                    <div className="text-[10px] opacity-40 uppercase tracking-tighter mb-2">
                      {highlight.chapter || 'Highlight'} / {new Date(highlight.date).toLocaleDateString()}
                    </div>
                    <blockquote className="text-xs font-serif leading-relaxed border-l-2 border-[var(--theme-accent)] pl-3 opacity-80">
                      {highlight.text}
                    </blockquote>
                    {highlight.note && (
                      <p className="mt-3 text-xs leading-relaxed text-[var(--theme-text)] opacity-70">
                        {highlight.note}
                      </p>
                    )}
                  </button>
                  <button
                    onClick={() => onRemoveHighlight(highlight.id)}
                    className="absolute top-4 right-4 p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <form
              className="sticky top-0 z-10 space-y-3 pb-3"
              style={{ background: 'var(--theme-surface)' }}
              onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit();
              }}
            >
              <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-white/5 px-3 transition-colors focus-within:border-[var(--theme-accent)]">
                <Search className="h-4 w-4 opacity-50" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder="Search this book..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
                  disabled={isSearching}
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                  {hasSearched ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}` : 'Whole book'}
                </span>
                <button
                  type="submit"
                  disabled={isSearching || searchQuery.trim().length < 2}
                  className="rounded-lg bg-[var(--theme-accent)] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSearching ? 'Searching' : 'Search'}
                </button>
              </div>
            </form>

            {searchError ? (
              <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
                {searchError}
              </div>
            ) : isSearching ? (
              <div className="py-12 text-center opacity-40 italic text-sm">
                Searching the book...
              </div>
            ) : !hasSearched ? (
              <div className="py-12 text-center opacity-40 italic text-sm">
                Enter at least two characters to search the whole EPUB.
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-12 text-center opacity-40 italic text-sm">
                No passages found.
              </div>
            ) : (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="block w-full rounded-xl border border-[var(--theme-border)] bg-white/5 p-4 text-left transition-all duration-300 hover:border-[var(--theme-accent)]/30"
                  onClick={() => onSearchResultClick(result.cfi)}
                >
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-tighter opacity-40">
                    {result.chapter || `Section ${result.sectionIndex + 1}`}
                  </div>
                  <p className="text-xs font-serif leading-relaxed opacity-80">
                    {result.excerpt}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TocItem({ 
  item, 
  onJump, 
  depth, 
  currentChapter 
}: { 
  item: TocEntry; 
  onJump: (cfi: string) => void; 
  depth: number;
  currentChapter?: string;
}) {
  const isActive = currentChapter?.trim() === item.label?.trim();

  return (
    <div className="space-y-1">
      <button
        onClick={() => onJump(item.href)}
        className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 group ${
          isActive ? 'bg-[var(--theme-accent-tint)]' : 'hover:bg-white/5'
        }`}
        style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
      >
        <ChevronRight className={`w-3 h-3 transition-opacity ${isActive ? 'opacity-100 text-[var(--theme-accent)]' : 'opacity-0 group-hover:opacity-40'}`} />
        <span className={`text-xs font-medium transition-all ${
          isActive ? 'text-[var(--theme-accent)] opacity-100' : 'opacity-70 group-hover:opacity-100'
        }`}>
          {item.label}
        </span>
      </button>
      {item.subitems && item.subitems.length > 0 && (
        <div className="space-y-1">
          {item.subitems.map((sub, i) => (
            <TocItem key={i} item={sub} onJump={onJump} depth={depth + 1} currentChapter={currentChapter} />
          ))}
        </div>
      )}
    </div>
  );
}
