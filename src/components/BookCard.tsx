'use client';

import Link from 'next/link';
import type { Book } from '@/types';

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/read/${book.id}`} id={`book-${book.id}`}>
      <div className="book-card group">
        {/* Cover Image */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-gray-800 to-gray-900">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={`Cover of ${book.title}`}
              className="cover-image"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full flex items-center justify-center text-gray-500"
              style={{ aspectRatio: '2/3' }}
            >
              <div className="text-center p-4">
                <div
                  className="text-4xl mb-2"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  📖
                </div>
                <p className="text-xs opacity-60">No Cover</p>
              </div>
            </div>
          )}

          {/* Hover overlay */}
          <div className="overlay">
            <span
              className="text-white text-xs font-medium px-3 py-1.5 rounded-full self-center"
              style={{
                background: 'rgba(99, 102, 241, 0.8)',
                backdropFilter: 'blur(4px)',
              }}
            >
              Continue Reading →
            </span>
          </div>
        </div>

        {/* Book Info */}
        <div
          className="p-3.5 rounded-b-2xl"
          style={{
            background: 'var(--theme-surface)',
            borderTop: '1px solid var(--theme-border)',
          }}
        >
          <h3
            className="font-semibold text-sm truncate mb-0.5"
            style={{ color: 'var(--theme-text)' }}
          >
            {book.title}
          </h3>
          <p
            className="text-xs truncate"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            {book.author}
          </p>
        </div>
      </div>
    </Link>
  );
}
