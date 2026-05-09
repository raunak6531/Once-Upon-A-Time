'use client';

import { useState } from 'react';
import type { Book } from '@/types';
import BookCard from './BookCard';
import UploadModal from './UploadModal';
import { Plus, Library } from 'lucide-react';

interface BookGridProps {
  books: Book[];
}

export default function BookGrid({ books: initialBooks }: BookGridProps) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [showUpload, setShowUpload] = useState(false);

  const handleUploadComplete = (newBook: Book) => {
    setBooks((prev) => [newBook, ...prev]);
    setShowUpload(false);
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--theme-text)' }}
          >
            My Library
          </h2>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            {books.length} {books.length === 1 ? 'book' : 'books'} in your collection
          </p>
        </div>
        <button
          id="upload-btn"
          onClick={() => setShowUpload(true)}
          className="btn-accent"
        >
          <Plus className="w-4 h-4" />
          Add Book
        </button>
      </div>

      {/* Grid or Empty State */}
      {books.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
            style={{
              background: 'var(--theme-surface)',
              border: '1px solid var(--theme-border)',
            }}
          >
            <Library className="w-10 h-10" style={{ color: 'var(--theme-muted)' }} />
          </div>
          <h3
            className="text-xl font-semibold mb-2"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--theme-text)' }}
          >
            Your library is empty
          </h3>
          <p className="text-sm mb-6 max-w-sm text-center" style={{ color: 'var(--theme-text-secondary)' }}>
            Upload your first EPUB book and experience reading with dynamic, cover-inspired themes.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="btn-accent"
          >
            <Plus className="w-4 h-4" />
            Upload Your First Book
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {books.map((book, index) => (
            <div
              key={book.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
            >
              <BookCard book={book} />
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
