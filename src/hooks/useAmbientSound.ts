'use client';

import { useEffect, useRef } from 'react';
import type { ReaderAmbienceSettings } from '@/types';

const AMBIENCE_SOURCES: Record<Exclude<ReaderAmbienceSettings['ambience'], 'off'>, string> = {
  rain: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sound_of_rain.ogg',
  fireplace: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Campfire_sound_ambience.ogg',
};

function fadeVolume(audio: HTMLAudioElement, targetVolume: number, durationMs = 420) {
  const startVolume = audio.volume;
  const startedAt = performance.now();
  let frame = 0;

  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    audio.volume = startVolume + (targetVolume - startVolume) * progress;

    if (progress < 1) {
      frame = requestAnimationFrame(tick);
    }
  };

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

export function useAmbientSound(settings: ReaderAmbienceSettings) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopFadeRef = useRef<(() => void) | null>(null);
  const volumeRef = useRef(settings.volume);

  useEffect(() => {
    volumeRef.current = settings.volume;
    const audio = audioRef.current;
    if (!audio) return;

    stopFadeRef.current?.();
    stopFadeRef.current = fadeVolume(audio, settings.volume, 160);
  }, [settings.volume]);

  useEffect(() => {
    stopFadeRef.current?.();
    stopFadeRef.current = null;

    if (!settings.enabled || settings.ambience === 'off') {
      const audio = audioRef.current;
      if (audio) {
        stopFadeRef.current = fadeVolume(audio, 0, 260);
        window.setTimeout(() => {
          audio.pause();
          audioRef.current = null;
        }, 280);
      }
      return;
    }

    const audio = new Audio(AMBIENCE_SOURCES[settings.ambience]);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    audioRef.current = audio;

    audio.play()
      .then(() => {
        stopFadeRef.current = fadeVolume(audio, volumeRef.current);
      })
      .catch((error) => {
        console.error('Failed to play ambience:', error);
      });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        audio.pause();
      } else if (settings.enabled) {
        audio.play().catch((error) => {
          console.error('Failed to resume ambience:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopFadeRef.current?.();
      stopFadeRef.current = fadeVolume(audio, 0, 220);
      window.setTimeout(() => {
        audio.pause();
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      }, 240);
    };
  }, [settings.ambience, settings.enabled]);

}
