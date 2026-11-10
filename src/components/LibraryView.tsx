'use client';

import { useState } from 'react';
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
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--bg)' }}>
      <BookshelfLibrary
        books={books}
        sessions={sessions}
        noteCounts={noteCounts}
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
