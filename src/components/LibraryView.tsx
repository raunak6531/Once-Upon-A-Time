'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Book, ReadingSession } from '@/types';
import Navbar from './Navbar';
import UploadModal from './UploadModal';
import BookshelfLibrary from './BookshelfLibrary';

interface LibraryViewProps {
  books: Book[];
  sessions: ReadingSession[];
}

export default function LibraryView({ books, sessions }: LibraryViewProps) {
  const [showUpload, setShowUpload] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--theme-bg)' }}>
      {/* Absolute Navbar so it floats over the library */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <Navbar />
        </div>
      </div>

      <BookshelfLibrary
        key={books.map((book) => `${book.id}:${book.updated_at || book.last_read_at || book.created_at}`).join('|')}
        books={books}
        sessions={sessions}
        onUploadClick={() => setShowUpload(true)}
      />

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploadComplete={() => {
            setShowUpload(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
