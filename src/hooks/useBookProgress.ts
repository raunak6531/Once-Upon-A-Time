'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useBookProgress(bookId: string, initialCfi: string | null) {
  const [currentCfi, setCurrentCfi] = useState<string | null>(initialCfi);
  const supabase = createClient();
  const savingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSaveRef = useRef<{ cfi: string; progressPercent?: number } | null>(null);

  async function persist(payload: { cfi: string; progressPercent?: number }) {
    if (savingRef.current) {
      latestSaveRef.current = payload;
      return;
    }

    savingRef.current = true;

    try {
      const update: { current_cfi: string; progress_percent?: number; last_read_at?: string } = {
        current_cfi: payload.cfi,
      };

      if (typeof payload.progressPercent === 'number') {
        update.progress_percent = Math.max(0, Math.min(100, Math.round(payload.progressPercent)));
        update.last_read_at = new Date().toISOString();
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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const pending = latestSaveRef.current;
      if (pending) {
        void persist(pending);
      } else if (currentCfi) {
        void persist({ cfi: currentCfi });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { currentCfi, saveCfi };
}
