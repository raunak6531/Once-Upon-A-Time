'use client';

import { useCallback, useEffect, useRef } from 'react';
import { recordReadingSession } from '@/lib/readingMetadata';

const INACTIVITY_LIMIT_MS = 60_000;
const HEARTBEAT_MS = 30_000;

export function useReadingSession(bookId: string, progress: number, enabled: boolean) {
  const progressRef = useRef(progress);
  const visibleRef = useRef(false);
  const segmentStartRef = useRef<number | null>(null);
  const segmentProgressStartRef = useRef(progress);
  const activeSecondsRef = useRef(0);
  const lastActivityRef = useRef(0);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const flush = useCallback(async () => {
    const startedAtMs = segmentStartRef.current;
    if (!startedAtMs) return;

    const now = Date.now();
    const durationSeconds = Math.max(0, Math.round((now - startedAtMs) / 1000));
    segmentStartRef.current = null;

    if (durationSeconds < 5) return;

    activeSecondsRef.current += durationSeconds;

    try {
      await recordReadingSession({
        bookId,
        durationSeconds,
        progressStart: segmentProgressStartRef.current,
        progressEnd: progressRef.current,
        startedAt: new Date(startedAtMs).toISOString(),
        endedAt: new Date(now).toISOString(),
      });
    } catch (error) {
      console.error('Failed to save reading session:', error);
    }
  }, [bookId]);

  const startSegment = useCallback(() => {
    if (!enabled || document.visibilityState !== 'visible' || segmentStartRef.current) return;
    segmentStartRef.current = Date.now();
    segmentProgressStartRef.current = progressRef.current;
    visibleRef.current = true;
  }, [enabled]);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    startSegment();
  }, [startSegment]);

  useEffect(() => {
    if (!enabled) return;

    const activityEvents = ['keydown', 'pointerdown', 'mousemove', 'touchstart', 'wheel'];
    const handleActivity = () => recordActivity();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        recordActivity();
      } else {
        visibleRef.current = false;
        void flush();
      }
    };
    const handleBlur = () => {
      visibleRef.current = false;
      void flush();
    };
    const handleFocus = () => recordActivity();

    activityEvents.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', flush);

    recordActivity();

    const interval = setInterval(() => {
      if (!segmentStartRef.current) return;

      const inactive = Date.now() - lastActivityRef.current > INACTIVITY_LIMIT_MS;
      if (inactive || document.visibilityState !== 'visible') {
        void flush();
        return;
      }

      void flush().then(() => {
        if (document.visibilityState === 'visible') {
          startSegment();
        }
      });
    }, HEARTBEAT_MS);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((event) => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', flush);
      void flush();
    };
  }, [enabled, flush, recordActivity, startSegment]);

  return { recordActivity, flushActivity: flush };
}
