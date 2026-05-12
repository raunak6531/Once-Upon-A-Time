'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ReadingStatus } from '@/types';

interface BookProgressOptions {
  initialProgressPercent?: number | null;
  initialReadingStatus?: ReadingStatus | null;
}

interface ProgressSave {
  cfi: string;
  progressPercent?: number;
  isInitialLocation?: boolean;
}

export function useBookProgress(
  bookId: string,
  initialCfi: string | null,
  options: BookProgressOptions = {}
) {
  const [currentCfi, setCurrentCfi] = useState<string | null>(initialCfi);
  const [supabase] = useState(() => createClient());
  const savingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSaveRef = useRef<ProgressSave | null>(null);
  const currentCfiRef = useRef(initialCfi);
  const initialCfiRef = useRef(initialCfi);
  const initialProgressRef = useRef(Math.max(0, Math.min(100, Math.round(options.initialProgressPercent || 0))));
  const statusRef = useRef<ReadingStatus | null>(options.initialReadingStatus || null);
  const hasSettledInitialLocationRef = useRef(false);

  function nextStatusForProgress(payload: ProgressSave): ReadingStatus | undefined {
    const currentStatus = statusRef.current;
    const hasProgress = typeof payload.progressPercent === 'number';
    const progress =
      typeof payload.progressPercent === 'number'
        ? Math.max(0, Math.min(100, Math.round(payload.progressPercent)))
        : 0;

    if (currentStatus === 'finished') {
      return undefined;
    }

    if (currentStatus === 'dnf') {
      if (payload.isInitialLocation) {
        return undefined;
      }

      if (hasProgress && progress >= 96) {
        return 'finished';
      }

      const movedForward =
        (hasProgress && progress > initialProgressRef.current) ||
        (Boolean(initialCfiRef.current) && payload.cfi !== initialCfiRef.current);

      return movedForward ? 'reading' : undefined;
    }

    if (hasProgress && progress >= 96) {
      return 'finished';
    }

    if (currentStatus !== 'reading' && (progress > 0 || Boolean(payload.cfi))) {
      return 'reading';
    }

    return undefined;
  }

  async function persist(payload: ProgressSave) {
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
        const nextStatus = nextStatusForProgress(payload);

        update.progress_percent = progressPercent;
        update.last_read_at = now;

        if (nextStatus) {
          update.reading_status = nextStatus;
          statusRef.current = nextStatus;
        }

        if (nextStatus === 'finished') {
          update.finished_at = now;
        }
      } else if (!statusRef.current && payload.cfi) {
        update.reading_status = 'reading';
        statusRef.current = 'reading';
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
    const isInitialLocation = !hasSettledInitialLocationRef.current;

    setCurrentCfi(cfi);
    currentCfiRef.current = cfi;
    latestSaveRef.current = { cfi, progressPercent, isInitialLocation };

    if (!hasSettledInitialLocationRef.current) {
      hasSettledInitialLocationRef.current = true;
    }

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
