'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, Type, Palette, AlignLeft, Maximize, Minus, Plus, Keyboard } from 'lucide-react';
import type { ReaderSettings } from '@/types';

interface SettingsPopoverProps {
  settings: ReaderSettings;
  onSettingsChange: (settings: Partial<ReaderSettings>) => void;
  suggestedColors?: { accent: string; tint: string } | null;
}

const themes: Array<{ id: ReaderSettings['theme']; label: string; bg: string; text: string }> = [
  { id: 'dark', label: 'Dark', bg: '#141418', text: '#ffffff' },
  { id: 'sepia', label: 'Sepia', bg: '#f4ecd8', text: '#000000' },
  { id: 'cream', label: 'Cream', bg: '#fffaf0', text: '#000000' },
  { id: 'midnight', label: 'Midnight', bg: '#000000', text: '#ffffff' },
  { id: 'solarized', label: 'Solarized', bg: '#001e26', text: '#ffffff' },
  { id: 'custom', label: 'Custom', bg: 'linear-gradient(45deg, #444, #888)', text: '#fff' },
];

const fontFamilies: Array<{ id: ReaderSettings['fontFamily']; label: string; font: string }> = [
  { id: 'serif', label: 'Serif', font: 'var(--font-serif)' },
  { id: 'sans', label: 'Sans', font: 'var(--font-sans)' },
  { id: 'mono', label: 'Mono', font: 'var(--font-mono)' },
  { id: 'publisher', label: 'Default', font: 'inherit' },
];

const lineHeights: Array<{ id: ReaderSettings['lineHeight']; label: string; value: number }> = [
  { id: 'compact', label: 'Compact', value: 1.4 },
  { id: 'normal', label: 'Normal', value: 1.8 },
  { id: 'relaxed', label: 'Relaxed', value: 2.2 },
];

const margins: Array<{ id: ReaderSettings['margin']; label: string; value: string }> = [
  { id: 'narrow', label: 'Narrow', value: '5%' },
  { id: 'normal', label: 'Normal', value: '15%' },
  { id: 'wide', label: 'Wide', value: '25%' },
];

export default function SettingsPopover({ settings, onSettingsChange, suggestedColors }: SettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        id="settings-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-300 group"
        style={{
          background: isOpen ? 'var(--theme-accent)' : 'var(--theme-surface)',
          color: isOpen ? 'white' : 'var(--theme-text)',
          border: '1px solid var(--theme-border)',
          boxShadow: isOpen ? '0 0 20px rgba(251, 191, 36, 0.4)' : 'none',
        }}
      >
        <Settings className={`w-5 h-5 transition-transform duration-500 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="popover glass overflow-y-auto max-h-[85vh] scrollbar-hide"
          style={{
            width: 'min(320px, calc(100vw - 1.5rem))',
            minWidth: 'min(320px, calc(100vw - 1.5rem))',
            padding: '1.5rem',
            right: 0,
            marginTop: '0.75rem',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            background: 'var(--theme-surface)',
            color: 'var(--theme-text)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Theme Presets */}
          <div className="mb-6">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 block opacity-50 flex items-center gap-2">
              <Palette className="w-3 h-3" /> Appearance
            </label>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSettingsChange({ theme: t.id })}
                  className={`relative h-12 rounded-lg border-2 transition-all duration-200 overflow-hidden flex flex-col items-center justify-center gap-1`}
                  style={{
                    background: t.bg,
                    borderColor: settings.theme === t.id ? 'var(--theme-accent)' : 'transparent',
                  }}
                >
                  <span style={{ color: t.text, fontWeight: 'bold', fontSize: '14px' }}>Aa</span>
                  <span style={{ color: t.text, fontSize: '8px', fontWeight: '600', textTransform: 'uppercase' }}>{t.label}</span>
                  {settings.theme === t.id && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] shadow-[0_0_8px_var(--theme-accent)]" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Theme Controls */}
            {settings.theme === 'custom' && (
              <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-4 animate-scale-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold opacity-50 uppercase tracking-wider">Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.customBg || '#141418'}
                        onChange={(e) => onSettingsChange({ customBg: e.target.value })}
                        className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.customBg || '#141418'}
                        onChange={(e) => onSettingsChange({ customBg: e.target.value })}
                        className="w-full bg-transparent border-none text-[10px] font-mono p-0 focus:ring-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold opacity-50 uppercase tracking-wider">Text</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.customText || '#e2e8f0'}
                        onChange={(e) => onSettingsChange({ customText: e.target.value })}
                        className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.customText || '#e2e8f0'}
                        onChange={(e) => onSettingsChange({ customText: e.target.value })}
                        className="w-full bg-transparent border-none text-[10px] font-mono p-0 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>

                {suggestedColors && (
                  <div className="pt-2 border-top border-white/5">
                    <label className="text-[9px] font-bold opacity-50 uppercase tracking-wider mb-2 block">Suggested from Cover</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSettingsChange({ customBg: suggestedColors.tint, customText: '#ffffff' })}
                        className="flex-1 h-8 rounded border border-white/10 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                        style={{ background: suggestedColors.tint }}
                      >
                        <span className="text-[9px] text-white font-medium">Apply Tint</span>
                      </button>
                      <button
                        onClick={() => onSettingsChange({ customBg: '#ffffff', customText: suggestedColors.accent })}
                        className="flex-1 h-8 rounded border border-white/10 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                        style={{ background: '#ffffff' }}
                      >
                        <span className="text-[9px] font-medium" style={{ color: suggestedColors.accent }}>Apply Accent</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Typography */}
          <div className="mb-6">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 block opacity-50 flex items-center gap-2">
              <Type className="w-3 h-3" /> Typography
            </label>
            <div className="flex gap-2 mb-4">
              {fontFamilies.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onSettingsChange({ fontFamily: f.id })}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200"
                  style={{
                    background: settings.fontFamily === f.id ? 'var(--theme-accent)' : 'rgba(255,255,255,0.06)',
                    color: settings.fontFamily === f.id ? 'black' : 'var(--theme-text)',
                    fontFamily: f.font,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Font Size Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] opacity-50">
                <span>SIZE</span>
                <span>{settings.fontSize}%</span>
              </div>
              <div className="flex items-center gap-3">
                <Minus className="w-3 h-3 opacity-50 cursor-pointer hover:opacity-100" onClick={() => onSettingsChange({ fontSize: Math.max(50, settings.fontSize - 10) })} />
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="1"
                  value={settings.fontSize}
                  onChange={(e) => onSettingsChange({ fontSize: parseInt(e.target.value) })}
                  className="flex-1 accent-[var(--theme-accent)] h-1 rounded-lg cursor-pointer"
                />
                <Plus className="w-3 h-3 opacity-50 cursor-pointer hover:opacity-100" onClick={() => onSettingsChange({ fontSize: Math.min(300, settings.fontSize + 10) })} />
              </div>
            </div>
          </div>

          {/* Layout Settings */}
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 block opacity-50 flex items-center gap-2">
                <AlignLeft className="w-3 h-3" /> Spacing
              </label>
              <div className="flex gap-2">
                {lineHeights.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => onSettingsChange({ lineHeight: l.id })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all duration-200 border ${
                      settings.lineHeight === l.id
                        ? 'bg-[var(--theme-accent)] text-black border-[var(--theme-accent)]'
                        : 'bg-transparent text-[var(--theme-text)] border-white/10 hover:border-white/30'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 block opacity-50 flex items-center gap-2">
                <Maximize className="w-3 h-3" /> Margins
              </label>
              <div className="flex gap-2">
                {margins.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSettingsChange({ margin: m.id })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all duration-200 border ${
                      settings.margin === m.id
                        ? 'bg-[var(--theme-accent)] text-black border-[var(--theme-accent)]'
                        : 'bg-transparent text-[var(--theme-text)] border-white/10 hover:border-white/30'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 block opacity-50 flex items-center gap-2">
              <Keyboard className="w-3 h-3" /> Shortcuts
            </label>
            <div className="reader-shortcuts">
              <span><kbd>←</kbd><kbd>→</kbd> Turn pages</span>
              <span><kbd>T</kbd> Contents</span>
              <span><kbd>S</kbd> Settings</span>
              <span><kbd>F</kbd> Fullscreen</span>
              <span><kbd>Ctrl</kbd><kbd>F</kbd> Search</span>
              <span><kbd>Esc</kbd> Close panels</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
