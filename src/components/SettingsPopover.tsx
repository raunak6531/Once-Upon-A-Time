'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, Moon, Sun, Type } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface SettingsPopoverProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

const fontSizeOptions = [
  { label: 'S', value: 80 },
  { label: 'M', value: 100 },
  { label: 'L', value: 120 },
  { label: 'XL', value: 140 },
];

export default function SettingsPopover({ fontSize, onFontSizeChange }: SettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { mode, toggleMode, colors } = useTheme();

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isDark = mode === 'dark';

  return (
    <div className="relative" ref={popoverRef}>
      <button
        id="settings-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{
          background: isOpen ? 'var(--theme-accent)' : 'rgba(255,255,255,0.1)',
          color: isOpen ? 'white' : 'var(--theme-text)',
        }}
      >
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="popover"
          style={{
            background: isDark ? 'rgb(30, 30, 42)' : 'rgb(255, 255, 255)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          }}
        >
          {/* Dynamic Theme Status */}
          {colors && (
            <div className="mb-4 pb-3" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
              <label
                className="text-xs font-medium uppercase tracking-wider mb-2 block"
                style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}
              >
                Dynamic Theme
              </label>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[colors.dominant, colors.accent, colors.muted].map((color, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border"
                      style={{
                        backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
                  From cover
                </span>
              </div>
            </div>
          )}

          {/* Dark/Light toggle */}
          <div className="mb-4">
            <label
              className="text-xs font-medium uppercase tracking-wider mb-2.5 block"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}
            >
              Appearance
            </label>
            <button
              id="mode-toggle-btn"
              onClick={toggleMode}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              {isDark ? (
                <Moon className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
              ) : (
                <Sun className="w-4 h-4" style={{ color: '#f59e0b' }} />
              )}
              <span
                className="text-sm font-medium flex-1 text-left"
                style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)' }}
              >
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </span>
              {/* Toggle switch */}
              <div
                className="w-11 h-6 rounded-full relative transition-colors duration-300"
                style={{
                  background: isDark ? 'var(--theme-accent)' : 'rgba(0,0,0,0.15)',
                }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300"
                  style={{
                    transform: isDark ? 'translateX(22px)' : 'translateX(2px)',
                  }}
                />
              </div>
            </button>
          </div>

          {/* Font Size */}
          <div>
            <label
              className="text-xs font-medium uppercase tracking-wider mb-2.5 flex items-center gap-1.5"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}
            >
              <Type className="w-3.5 h-3.5" />
              Font Size
            </label>
            <div className="flex gap-2">
              {fontSizeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onFontSizeChange(opt.value)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background:
                      fontSize === opt.value
                        ? 'var(--theme-accent)'
                        : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: fontSize === opt.value
                      ? 'white'
                      : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                    border: `1px solid ${
                      fontSize === opt.value
                        ? 'var(--theme-accent)'
                        : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                    }`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
