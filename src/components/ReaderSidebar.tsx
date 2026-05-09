import { X, Bookmark, List, Trash2, ChevronRight } from 'lucide-react';
import type { ReaderSettings } from '@/types';

interface ReaderSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  toc: any[];
  bookmarks: { id: string; cfi: string; label: string; date: string }[];
  onJump: (cfi: string) => void;
  onRemoveBookmark: (cfi: string) => void;
  currentCfi?: string | null;
  currentChapter?: string;
  activeTab: 'toc' | 'bookmarks';
  setActiveTab: (tab: 'toc' | 'bookmarks') => void;
}

export default function ReaderSidebar({
  isOpen,
  onClose,
  toc,
  bookmarks,
  onJump,
  onRemoveBookmark,
  currentCfi,
  currentChapter,
  activeTab,
  setActiveTab,
}: ReaderSidebarProps) {
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
      <div className="p-6 flex items-center justify-between border-b border-[var(--theme-border)]">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('toc')}
            className={`text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === 'toc' ? 'text-[var(--theme-accent)]' : 'opacity-40 hover:opacity-100'
            }`}
          >
            Contents
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === 'bookmarks' ? 'text-[var(--theme-accent)]' : 'opacity-40 hover:opacity-100'
            }`}
          >
            Bookmarks
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
        ) : (
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
  item: any; 
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
          {item.subitems.map((sub: any, i: number) => (
            <TocItem key={i} item={sub} onJump={onJump} depth={depth + 1} currentChapter={currentChapter} />
          ))}
        </div>
      )}
    </div>
  );
}
