'use client';

import { createClient } from '@/lib/supabase/client';
import type { Book, ReadingStatus } from '@/types';

export interface BookOrganizationUpdate {
  reading_status?: ReadingStatus | null;
  is_favorite?: boolean;
  tags?: string[];
}

export interface ReadingSessionInput {
  bookId: string;
  durationSeconds: number;
  progressStart: number;
  progressEnd: number;
  startedAt: string;
  endedAt: string;
}

function normalizedTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 32))
    )
  ).slice(0, 12);
}

export async function updateBookOrganization(bookId: string, update: BookOrganizationUpdate) {
  const supabase = createClient();
  const payload: BookOrganizationUpdate = { ...update };

  if (payload.tags) {
    payload.tags = normalizedTags(payload.tags);
  }

  const { data, error } = await supabase
    .from('books')
    .update(payload)
    .eq('id', bookId)
    .select()
    .single();

  if (error) throw error;
  return data as Book;
}

export async function recordReadingSession(input: ReadingSessionInput) {
  if (input.durationSeconds <= 0) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existingBook } = await supabase
    .from('books')
    .select('total_reading_seconds, reading_status, finished_at')
    .eq('id', input.bookId)
    .single();

  const currentTotal = Number(existingBook?.total_reading_seconds || 0);
  const progressEnd = Math.max(0, Math.min(100, Math.round(input.progressEnd)));
  const shouldMarkReading = !existingBook?.reading_status && progressEnd > 0 && progressEnd < 96;
  const shouldMarkFinished = progressEnd >= 96 && existingBook?.reading_status !== 'finished';

  const bookUpdate: Partial<Book> = {
    progress_percent: progressEnd,
    last_read_at: input.endedAt,
    total_reading_seconds: currentTotal + input.durationSeconds,
  };

  if (shouldMarkReading) {
    bookUpdate.reading_status = 'reading';
  }

  if (shouldMarkFinished) {
    bookUpdate.reading_status = 'finished';
    bookUpdate.finished_at = existingBook?.finished_at || input.endedAt;
  }

  const [{ error: sessionError }, { error: bookError }] = await Promise.all([
    supabase.from('reading_sessions').insert({
      user_id: user.id,
      book_id: input.bookId,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      duration_seconds: input.durationSeconds,
      progress_start: Math.round(input.progressStart),
      progress_end: progressEnd,
    }),
    supabase.from('books').update(bookUpdate).eq('id', input.bookId),
  ]);

  if (sessionError) throw sessionError;
  if (bookError) throw bookError;
}
