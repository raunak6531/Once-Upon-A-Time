'use client';

import { useCallback } from 'react';
import type { ReaderPageTurnSoundSettings } from '@/types';

const PAGE_TURN_SOURCE = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Turning_a_page.ogg';

export function usePageTurnSound(settings: ReaderPageTurnSoundSettings) {
  return useCallback(() => {
    if (!settings.enabled || typeof window === 'undefined') return;

    const audio = new Audio(PAGE_TURN_SOURCE);
    audio.volume = settings.volume;
    audio.play().catch((error) => {
      console.error('Failed to play page turn sound:', error);
    });
  }, [settings.enabled, settings.volume]);
}
