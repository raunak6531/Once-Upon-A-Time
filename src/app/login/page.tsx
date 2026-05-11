'use client';

import { useEffect, useState } from 'react';
import { Feather, Loader2, Lock, Mail } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OUATLogo } from '@/components/OUATLogo';

const LITERARY_QUOTES = [
  { text: '"A reader lives a thousand lives before he dies."', author: '- George R.R. Martin' },
  { text: '"One must always be careful of books."', author: '- Cassandra Clare' },
  { text: '"We read to know we are not alone."', author: '- C.S. Lewis' },
  { text: '"A book is a dream you hold in your hands."', author: '- Neil Gaiman' },
  { text: '"There is no friend as loyal as a book."', author: '- Ernest Hemingway' },
];

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

function FloatingParticle({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: '-20px',
        background: 'radial-gradient(circle, rgba(251, 191, 36, 0.55) 0%, transparent 70%)',
        animation: `particleRise 11s ease-in infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

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

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError =
    searchParams.get('error') === 'auth_callback_failed'
      ? 'That link is no longer valid. Please try again.'
      : null;

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % LITERARY_QUOTES.length);
    }, 5000);

    return () => clearInterval(quoteInterval);
  }, []);

  const isSignUp = mode === 'sign-up';
  const isForgotPassword = mode === 'forgot-password';

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
          router.push('/library');
          router.refresh();
        }
      } else {
        await postJson('/api/auth/sign-in', { email, password });
        router.push('/library');
        router.refresh();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0c0a1a 0%, #1a1035 30%, #12101f 60%, #0a0a14 100%)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '600px',
            height: '700px',
            background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.08) 0%, rgba(139, 92, 246, 0.04) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {Array.from({ length: 15 }).map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 0.8}
            x={10 + ((i * 17) % 80)}
            size={3 + (i % 5)}
          />
        ))}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full"
            style={{
              width: 1 + (i % 2),
              height: 1 + (i % 2),
              left: `${(i * 13) % 100}%`,
              top: `${(i * 19) % 100}%`,
              background: 'rgba(255,255,255,0.3)',
              animation: `twinkle ${3 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i % 5) * 0.7}s`,
            }}
          />
        ))}
      </div>

      <div
        className="relative z-10 transition-all duration-700 opacity-100 translate-y-0"
        style={{ perspective: '1000px' }}
      >
        <div className="absolute left-1/2 -translate-x-1/2 -top-16 z-20 flex flex-col items-center">
          <div
            className="w-1 rounded-full"
            style={{
              height: '40px',
              background: 'linear-gradient(to bottom, rgba(251,191,36,0.2), rgba(251,191,36,0.6))',
            }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background: 'radial-gradient(circle, #fbbf24 30%, #b45309 100%)',
              boxShadow: '0 0 12px rgba(251,191,36,0.5)',
            }}
          />
        </div>

        <div
          className="relative"
          style={{
            width: '380px',
            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(175deg, #1e1b30 0%, #171425 40%, #13111f 100%)',
              borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(251, 191, 36, 0.15)',
              borderBottom: 'none',
              padding: '2.5rem 2rem 1.5rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.6), rgba(251,191,36,0.2), rgba(251,191,36,0.6), transparent)',
                animation: 'shimmerGold 3s ease-in-out infinite',
              }}
            />

            <div
              className="absolute top-3 left-3 w-6 h-6 opacity-20"
              style={{ borderTop: '2px solid #fbbf24', borderLeft: '2px solid #fbbf24', borderRadius: '4px 0 0 0' }}
            />
            <div
              className="absolute top-3 right-3 w-6 h-6 opacity-20"
              style={{ borderTop: '2px solid #fbbf24', borderRight: '2px solid #fbbf24', borderRadius: '0 4px 0 0' }}
            />

            <div className="text-center mb-6">
              <div className="inline-block mb-2">
                <OUATLogo size={56} />
              </div>
              <h1
                className="text-2xl font-bold text-white mb-1"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Once Upon A Time
              </h1>
              <p className="text-xs" style={{ color: 'rgba(251, 191, 36, 0.7)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Your story awaits
              </p>
            </div>

            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => handleModeChange('sign-in')}
                className={`btn-3d flex-1 py-2.5 text-sm ${mode === 'sign-in' ? 'btn-3d-purple' : 'btn-3d-slate'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('sign-up')}
                className={`btn-3d flex-1 py-2.5 text-sm ${mode === 'sign-up' ? 'btn-3d-purple' : 'btn-3d-slate'}`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="relative group">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                  style={{ color: 'rgba(251, 191, 36, 0.5)' }}
                />
                <input
                  id="email-input"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(251, 191, 36, 0.12)',
                  }}
                />
              </div>

              {!isForgotPassword && (
                <div className="relative group">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                    style={{ color: 'rgba(251, 191, 36, 0.5)' }}
                  />
                  <input
                    id="password-input"
                    type="password"
                    placeholder={isSignUp ? 'Create password' : 'Password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(251, 191, 36, 0.12)',
                    }}
                  />
                </div>
              )}

              {isSignUp && (
                <div className="relative group">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                    style={{ color: 'rgba(251, 191, 36, 0.5)' }}
                  />
                  <input
                    id="confirm-password-input"
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(251, 191, 36, 0.12)',
                    }}
                  />
                </div>
              )}

              {isSignUp && (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.52)' }}>
                  Use at least 8 characters with at least one letter and one number.
                </p>
              )}

              {(error || callbackError) && (
                <div
                  className="text-sm p-3 rounded-xl animate-fade-in flex items-center gap-2"
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <span>!</span> {error || callbackError}
                </div>
              )}

              {message && (
                <div
                  className="text-sm p-3 rounded-xl animate-fade-in flex items-center gap-2"
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
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="btn-3d btn-3d-amber w-full py-3.5 text-sm mt-2"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Feather className="w-4 h-4" />
                    {isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Begin Your Story' : 'Open Your Book'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center text-sm">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => handleModeChange('sign-in')}
                  className="text-amber-300 hover:text-amber-200 transition-colors"
                >
                  Back to sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleModeChange('forgot-password')}
                  className="text-amber-300 hover:text-amber-200 transition-colors"
                >
                  Forgot your password?
                </button>
              )}
            </div>
          </div>

          <div className="relative" style={{ height: '40px' }}>
            <svg
              viewBox="0 0 380 40"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="bookmarkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#13111f" />
                  <stop offset="100%" stopColor="#0e0c18" />
                </linearGradient>
              </defs>
              <path
                d="M0,0 L0,30 L190,10 L380,30 L380,0 Z"
                fill="url(#bookmarkGrad)"
                stroke="rgba(251, 191, 36, 0.15)"
                strokeWidth="1"
              />
            </svg>
          </div>
        </div>

        <div className="text-center mt-8 max-w-sm mx-auto" style={{ minHeight: '56px' }}>
          <p
            className="text-base italic transition-opacity duration-500"
            style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-serif)', lineHeight: '1.6' }}
            key={quoteIndex}
          >
            {LITERARY_QUOTES[quoteIndex].text}
            <br />
            <span style={{ color: 'rgba(251, 191, 36, 0.5)', fontStyle: 'normal', fontSize: '0.75rem' }}>
              {LITERARY_QUOTES[quoteIndex].author}
            </span>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes particleRise {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-100vh) scale(0.3);
            opacity: 0;
          }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
        @keyframes shimmerGold {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
