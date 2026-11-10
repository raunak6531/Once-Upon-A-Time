'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

async function postJson<T>(url: string, payload: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

interface LandingAuthFormProps {
  initialEmail?: string;
  initialMode?: AuthMode;
  initialError?: string | null;
}

export default function LandingAuthForm({
  initialEmail = '',
  initialMode = 'sign-up',
  initialError = null,
}: LandingAuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Listen to the hero form or query params
  useEffect(() => {
    const heroInput = document.getElementById('hero-email-input') as HTMLInputElement | null;
    const heroForm = document.getElementById('hero-email-form') as HTMLFormElement | null;

    const handleHeroSubmit = (e: Event) => {
      e.preventDefault();
      if (heroInput && heroInput.value) {
        setEmail(heroInput.value);
        setMode('sign-up');
      }
      const joinSection = document.getElementById('join');
      if (joinSection) {
        joinSection.scrollIntoView({ behavior: 'smooth' });
      }
      const passwordInput = document.getElementById('join-password-input');
      passwordInput?.focus();
    };

    if (heroForm) {
      heroForm.addEventListener('submit', handleHeroSubmit);
    }

    // Also check nav "Sign in" clicks
    const handleNavSignIn = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest('a[href="#join"]');
      if (link && link.textContent?.trim().toLowerCase().includes('sign in')) {
        setMode('sign-in');
      } else if (link && link.textContent?.trim().toLowerCase().includes('get started')) {
        setMode('sign-up');
      }
    };

    document.addEventListener('click', handleNavSignIn);

    return () => {
      if (heroForm) {
        heroForm.removeEventListener('submit', handleHeroSubmit);
      }
      document.removeEventListener('click', handleNavSignIn);
    };
  }, []);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'forgot-password') {
        const data = await postJson<{ message: string }>('/api/auth/forgot-password', { email });
        setMessage(data.message);
        setMode('sign-in');
      } else if (mode === 'sign-up') {
        const data = await postJson<{ message: string; requiresEmailConfirmation: boolean }>(
          '/api/auth/sign-up',
          { email, password, confirmPassword }
        );

        setMessage(data.message);

        if (data.requiresEmailConfirmation) {
          setMode('sign-in');
        } else {
          startTransition(() => {
            router.push('/library');
            router.refresh();
          });
        }
      } else {
        await postJson('/api/auth/sign-in', { email, password });
        startTransition(() => {
          router.push('/library');
          router.refresh();
        });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const isForgotPassword = mode === 'forgot-password';

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full md:w-[420px] p-8 md:p-14 box-border border-t md:border-t-0 md:border-l border-[var(--line)] bg-[rgba(15,13,12,0.6)]"
    >
      <div className="flex gap-6 mb-7">
        <button
          type="button"
          onClick={() => handleModeChange('sign-up')}
          className={`pb-3 text-[15px] font-medium transition-colors border-b-2 cursor-pointer ${
            mode === 'sign-up'
              ? 'border-[var(--accent)] text-[var(--text)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('sign-in')}
          className={`pb-3 text-[15px] font-medium transition-colors border-b-2 cursor-pointer ${
            mode === 'sign-in' || mode === 'forgot-password'
              ? 'border-[var(--accent)] text-[var(--text)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          Sign in
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="join-email-input" className="block text-[13px] text-[var(--muted)] mb-2">
          Email
        </label>
        <input
          id="join-email-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="block w-full h-[46px] px-3.5 rounded-[10px] bg-[rgba(255,240,220,0.04)] border border-[var(--line)] text-[var(--text)] placeholder-[var(--muted)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {!isForgotPassword && (
        <div className="mb-4">
          <label htmlFor="join-password-input" className="block text-[13px] text-[var(--muted)] mb-2">
            Password
          </label>
          <input
            id="join-password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder={mode === 'sign-up' ? 'At least 8 characters' : 'Enter password'}
            className="block w-full h-[46px] px-3.5 rounded-[10px] bg-[rgba(255,240,220,0.04)] border border-[var(--line)] text-[var(--text)] placeholder-[var(--muted)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      )}

      {mode === 'sign-up' && (
        <div className="mb-4">
          <label htmlFor="join-confirm-password" className="block text-[13px] text-[var(--muted)] mb-2">
            Confirm password
          </label>
          <input
            id="join-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Confirm password"
            className="block w-full h-[46px] px-3.5 rounded-[10px] bg-[rgba(255,240,220,0.04)] border border-[var(--line)] text-[var(--text)] placeholder-[var(--muted)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
          />
          <p className="text-xs text-[var(--muted)] mt-1.5">
            Use at least 8 characters with at least one letter and one number.
          </p>
        </div>
      )}

      {error && (
        <div
          className="text-sm p-3 rounded-[10px] mb-4 flex items-center gap-2"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <span className="font-bold">!</span> {error}
        </div>
      )}

      {message && (
        <div
          className="text-sm p-3 rounded-[10px] mb-4 flex items-center gap-2"
          style={{
            background: 'rgba(34, 197, 94, 0.12)',
            color: '#86efac',
            border: '1px solid rgba(34, 197, 94, 0.2)',
          }}
        >
          <span>*</span> {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-[48px] rounded-[10px] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer border-0 shadow-none mt-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isForgotPassword ? (
          'Send reset link'
        ) : (
          'Open your library'
        )}
      </button>

      <div className="mt-4 text-center text-sm">
        {isForgotPassword ? (
          <button
            type="button"
            onClick={() => handleModeChange('sign-in')}
            className="text-[var(--accent)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            Back to sign in
          </button>
        ) : mode === 'sign-in' ? (
          <button
            type="button"
            onClick={() => handleModeChange('forgot-password')}
            className="text-[var(--accent)] hover:opacity-80 transition-opacity cursor-pointer text-xs"
          >
            Forgot your password?
          </button>
        ) : null}
      </div>
    </form>
  );
}

