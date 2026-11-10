'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Book, ReadingSession } from '@/types';
import UploadModal from './UploadModal';
import BookshelfLibrary from './BookshelfLibrary';

interface LibraryViewProps {
  books: Book[];
  sessions: ReadingSession[];
  noteCounts: Record<string, number>;
}

export default function LibraryView({ books, sessions, noteCounts }: LibraryViewProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [extraBooks, setExtraBooks] = useState<Book[]>([]);
  const router = useRouter();

  // Combine server books with newly uploaded books for immediate rendering
  const combinedBooks = useMemo(() => {
    const serverIds = new Set(books.map((b) => b.id));
    const pending = extraBooks.filter((b) => !serverIds.has(b.id));
    return [...pending, ...books];
  }, [books, extraBooks]);

  const handleUploadComplete = (newBook: Book) => {
    setShowUpload(false);
    if (newBook && newBook.id) {
      setExtraBooks((prev) => [newBook, ...prev]);
    }
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--bg)' }}>
      <BookshelfLibrary
        books={combinedBooks}
        sessions={sessions}
        noteCounts={noteCounts}
        onUploadClick={() => setShowUpload(true)}
      />

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
