'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ReadingStatus } from '@/types';

export function useBookProgress(bookId: string, initialCfi: string | null) {
  const [currentCfi, setCurrentCfi] = useState<string | null>(initialCfi);
  const [supabase] = useState(() => createClient());
  const savingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSaveRef = useRef<{ cfi: string; progressPercent?: number } | null>(null);
  const currentCfiRef = useRef(initialCfi);

  async function persist(payload: { cfi: string; progressPercent?: number }) {
    if (savingRef.current) {
      latestSaveRef.current = payload;
      return;
    }

    savingRef.current = true;

    try {
      const update: {
        current_cfi: string;
        progress_percent?: number;
        last_read_at?: string;
        reading_status?: ReadingStatus;
        finished_at?: string;
      } = {
        current_cfi: payload.cfi,
      };

      if (typeof payload.progressPercent === 'number') {
        const progressPercent = Math.max(0, Math.min(100, Math.round(payload.progressPercent)));
        const now = new Date().toISOString();

        update.progress_percent = progressPercent;
        update.last_read_at = now;

        if (progressPercent >= 96) {
          update.reading_status = 'finished';
          update.finished_at = now;
        } else if (progressPercent > 0) {
          update.reading_status = 'reading';
        }
      }

      await supabase
        .from('books')
        .update(update)
        .eq('id', bookId);
    } catch (err) {
      console.error('Failed to save reading progress:', err);
    } finally {
      savingRef.current = false;

      if (latestSaveRef.current && latestSaveRef.current.cfi !== payload.cfi) {
        const next = latestSaveRef.current;
        latestSaveRef.current = null;
        void persist(next);
      }
    }
  }

  function saveCfi(cfi: string, progressPercent?: number) {
    setCurrentCfi(cfi);
    currentCfiRef.current = cfi;
    latestSaveRef.current = { cfi, progressPercent };

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (latestSaveRef.current) {
        const next = latestSaveRef.current;
        latestSaveRef.current = null;
        void persist(next);
      }
    }, 2000);
  }

  async function flushProgress() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const pending = latestSaveRef.current;
    if (pending) {
      latestSaveRef.current = null;
      await persist(pending);
    } else if (currentCfiRef.current) {
      await persist({ cfi: currentCfiRef.current });
    }
  }

  useEffect(() => {
    return () => {
      void flushProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { currentCfi, saveCfi, flushProgress };
}
