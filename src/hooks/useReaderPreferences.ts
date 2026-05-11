'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ReaderAmbienceId,
  ReaderAmbienceSettings,
  ReaderPageTurnSoundSettings,
  ReaderPreferences,
  ReaderSettings,
} from '@/types';

const STORAGE_VERSION = 1;

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: 'dark',
  fontFamily: 'serif',
  fontSize: 100,
  lineHeight: 'normal',
  margin: 'normal',
  customBg: '#141418',
  customText: '#e2e8f0',
};

const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  settings: DEFAULT_READER_SETTINGS,
  isPinned: false,
  ambience: {
    ambience: 'off',
    volume: 0.34,
    enabled: false,
  },
  pageTurnSound: {
    enabled: false,
    volume: 0.16,
  },
};

const themes = new Set<ReaderSettings['theme']>([
  'dark',
  'sepia',
  'cream',
  'midnight',
  'solarized',
  'custom',
]);
const fontFamilies = new Set<ReaderSettings['fontFamily']>(['serif', 'sans', 'mono', 'publisher']);
const lineHeights = new Set<ReaderSettings['lineHeight']>(['compact', 'normal', 'relaxed']);
const margins = new Set<ReaderSettings['margin']>(['narrow', 'normal', 'wide']);
const ambiences = new Set<ReaderAmbienceId>(['off', 'rain', 'fireplace']);

function storageKey(bookId: string) {
  return `reader_preferences_${bookId}`;
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function normalizeSettings(value: unknown): ReaderSettings {
  const candidate = typeof value === 'object' && value ? (value as Partial<ReaderSettings>) : {};
  const fontSize = typeof candidate.fontSize === 'number' ? candidate.fontSize : DEFAULT_READER_SETTINGS.fontSize;

  return {
    theme: candidate.theme && themes.has(candidate.theme) ? candidate.theme : DEFAULT_READER_SETTINGS.theme,
    fontFamily:
      candidate.fontFamily && fontFamilies.has(candidate.fontFamily)
        ? candidate.fontFamily
        : DEFAULT_READER_SETTINGS.fontFamily,
    fontSize: Math.min(300, Math.max(50, Math.round(fontSize))),
    lineHeight:
      candidate.lineHeight && lineHeights.has(candidate.lineHeight)
        ? candidate.lineHeight
        : DEFAULT_READER_SETTINGS.lineHeight,
    margin: candidate.margin && margins.has(candidate.margin) ? candidate.margin : DEFAULT_READER_SETTINGS.margin,
    customBg: readString(candidate.customBg, DEFAULT_READER_SETTINGS.customBg || '#141418'),
    customText: readString(candidate.customText, DEFAULT_READER_SETTINGS.customText || '#e2e8f0'),
  };
}

function normalizeAmbience(value: unknown): ReaderAmbienceSettings {
  const candidate =
    typeof value === 'object' && value ? (value as Partial<ReaderAmbienceSettings>) : {};
  const volume = typeof candidate.volume === 'number' ? candidate.volume : DEFAULT_READER_PREFERENCES.ambience.volume;
  const ambience =
    candidate.ambience && ambiences.has(candidate.ambience)
      ? candidate.ambience
      : DEFAULT_READER_PREFERENCES.ambience.ambience;

  return {
    ambience,
    volume: Math.min(1, Math.max(0, volume)),
    enabled:
      ambience !== 'off' && typeof candidate.enabled === 'boolean'
        ? candidate.enabled
        : DEFAULT_READER_PREFERENCES.ambience.enabled,
  };
}

function normalizePageTurnSound(value: unknown): ReaderPageTurnSoundSettings {
  const candidate =
    typeof value === 'object' && value ? (value as Partial<ReaderPageTurnSoundSettings>) : {};
  const volume = typeof candidate.volume === 'number' ? candidate.volume : DEFAULT_READER_PREFERENCES.pageTurnSound.volume;

  return {
    enabled:
      typeof candidate.enabled === 'boolean'
        ? candidate.enabled
        : DEFAULT_READER_PREFERENCES.pageTurnSound.enabled,
    volume: Math.min(1, Math.max(0, volume)),
  };
}

function normalizePreferences(value: unknown): ReaderPreferences {
  const candidate =
    typeof value === 'object' && value ? (value as Partial<ReaderPreferences> & { version?: number }) : {};

  return {
    settings: normalizeSettings(candidate.settings),
    isPinned: typeof candidate.isPinned === 'boolean' ? candidate.isPinned : DEFAULT_READER_PREFERENCES.isPinned,
    ambience: normalizeAmbience(candidate.ambience),
    pageTurnSound: normalizePageTurnSound(candidate.pageTurnSound),
  };
}

function loadPreferences(bookId: string): ReaderPreferences {
  if (typeof window === 'undefined') return DEFAULT_READER_PREFERENCES;

  try {
    const saved = window.localStorage.getItem(storageKey(bookId));
    if (!saved) return DEFAULT_READER_PREFERENCES;
    return normalizePreferences(JSON.parse(saved));
  } catch (error) {
    console.error('Failed to load reader preferences:', error);
    return DEFAULT_READER_PREFERENCES;
  }
}

export function useReaderPreferences(bookId: string) {
  const [preferences, setPreferences] = useState<ReaderPreferences>(() => loadPreferences(bookId));

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey(bookId),
        JSON.stringify({
          version: STORAGE_VERSION,
          ...preferences,
        })
      );
    } catch (error) {
      console.error('Failed to save reader preferences:', error);
    }
  }, [bookId, preferences]);

  const setSettings = useCallback((newSettings: Partial<ReaderSettings>) => {
    setPreferences((prev) => ({
      ...prev,
      settings: normalizeSettings({
        ...prev.settings,
        ...newSettings,
      }),
    }));
  }, []);

  const setIsPinned = useCallback((isPinned: boolean | ((prev: boolean) => boolean)) => {
    setPreferences((prev) => ({
      ...prev,
      isPinned: typeof isPinned === 'function' ? isPinned(prev.isPinned) : isPinned,
    }));
  }, []);

  const setAmbience = useCallback((ambience: Partial<ReaderAmbienceSettings>) => {
    setPreferences((prev) => ({
      ...prev,
      ambience: normalizeAmbience({
        ...prev.ambience,
        ...ambience,
      }),
    }));
  }, []);

  const setPageTurnSound = useCallback((pageTurnSound: Partial<ReaderPageTurnSoundSettings>) => {
    setPreferences((prev) => ({
      ...prev,
      pageTurnSound: normalizePageTurnSound({
        ...prev.pageTurnSound,
        ...pageTurnSound,
      }),
    }));
  }, []);

  return useMemo(
    () => ({
      settings: preferences.settings,
      isPinned: preferences.isPinned,
      ambience: preferences.ambience,
      pageTurnSound: preferences.pageTurnSound,
      setSettings,
      setIsPinned,
      setAmbience,
      setPageTurnSound,
    }),
    [
      preferences.settings,
      preferences.isPinned,
      preferences.ambience,
      preferences.pageTurnSound,
      setSettings,
      setIsPinned,
      setAmbience,
      setPageTurnSound,
    ]
  );
}
