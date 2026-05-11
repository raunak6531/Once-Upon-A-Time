'use client';

import { useState } from 'react';
import { CloudRain, Flame, Volume2, VolumeX, type LucideIcon } from 'lucide-react';
import type { ReaderAmbienceId, ReaderAmbienceSettings, ReaderPageTurnSoundSettings } from '@/types';

interface AmbiencePopoverProps {
  ambience: ReaderAmbienceSettings;
  onAmbienceChange: (ambience: Partial<ReaderAmbienceSettings>) => void;
  pageTurnSound: ReaderPageTurnSoundSettings;
  onPageTurnSoundChange: (pageTurnSound: Partial<ReaderPageTurnSoundSettings>) => void;
}

const ambienceOptions: Array<{
  id: Exclude<ReaderAmbienceId, 'off'>;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'rain', label: 'Rain', icon: CloudRain },
  { id: 'fireplace', label: 'Fireplace', icon: Flame },
];

export default function AmbiencePopover({
  ambience,
  onAmbienceChange,
  pageTurnSound,
  onPageTurnSoundChange,
}: AmbiencePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isPlaying = ambience.enabled && ambience.ambience !== 'off';
  const ActiveIcon = ambienceOptions.find((option) => option.id === ambience.ambience)?.icon || Volume2;

  const chooseAmbience = (id: Exclude<ReaderAmbienceId, 'off'>) => {
    onAmbienceChange({ ambience: id, enabled: true });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${
          isPlaying
            ? 'bg-[var(--theme-accent)] text-black border-[var(--theme-accent)]'
            : 'hover:bg-[var(--theme-surface)] text-[var(--theme-text)] border-[var(--theme-border)]'
        }`}
        title="Reading ambience"
      >
        {isPlaying ? <ActiveIcon className="w-5 h-5" /> : <VolumeX className="w-5 h-5 opacity-60" />}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-12 z-50 w-72 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl"
          style={{
            background: 'color-mix(in srgb, var(--theme-surface) 88%, black)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-text)',
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-accent)]">
                Ambience
              </p>
              <p className="mt-1 text-xs opacity-60">Soft background sound for reading.</p>
            </div>
            <button
              type="button"
              onClick={() => onAmbienceChange({ enabled: !isPlaying, ambience: ambience.ambience === 'off' ? 'rain' : ambience.ambience })}
              className="rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:border-[var(--theme-accent)]"
            >
              {isPlaying ? 'Off' : 'On'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ambienceOptions.map((option) => {
              const Icon = option.icon;
              const isActive = isPlaying && ambience.ambience === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => chooseAmbience(option.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition-all ${
                    isActive
                      ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-tint)] text-[var(--theme-accent)]'
                      : 'border-[var(--theme-border)] bg-white/5 hover:border-[var(--theme-accent)]/40'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>

          <label className="mt-4 block">
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] opacity-60">
              <span>Volume</span>
              <span>{Math.round(ambience.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={ambience.volume}
              onChange={(event) => onAmbienceChange({ volume: Number(event.target.value) })}
              className="h-1 w-full cursor-pointer accent-[var(--theme-accent)]"
            />
          </label>

          <div className="mt-4 border-t border-[var(--theme-border)] pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-accent)]">
                  Page Turn
                </p>
                <p className="mt-1 text-xs opacity-60">A tiny paper tick on navigation.</p>
              </div>
              <button
                type="button"
                onClick={() => onPageTurnSoundChange({ enabled: !pageTurnSound.enabled })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  pageTurnSound.enabled
                    ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-tint)] text-[var(--theme-accent)]'
                    : 'border-[var(--theme-border)] hover:border-[var(--theme-accent)]'
                }`}
              >
                {pageTurnSound.enabled ? 'On' : 'Off'}
              </button>
            </div>

            <label className="block">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] opacity-60">
                <span>Volume</span>
                <span>{Math.round(pageTurnSound.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={pageTurnSound.volume}
                onChange={(event) => onPageTurnSoundChange({ volume: Number(event.target.value) })}
                className="h-1 w-full cursor-pointer accent-[var(--theme-accent)]"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
