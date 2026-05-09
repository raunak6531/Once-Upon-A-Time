'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Loader2, Feather } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OUATLogo } from '@/components/OUATLogo';

const LITERARY_QUOTES = [
  { text: '"A reader lives a thousand lives before he dies."', author: '— George R.R. Martin' },
  { text: '"One must always be careful of books."', author: '— Cassandra Clare' },
  { text: '"We read to know we are not alone."', author: '— C.S. Lewis' },
  { text: '"A book is a dream you hold in your hands."', author: '— Neil Gaiman' },
  { text: '"There is no friend as loyal as a book."', author: '— Ernest Hemingway' },
];

/* Floating particle for background atmosphere */
function FloatingParticle({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: '-20px',
        background: `radial-gradient(circle, rgba(251, 191, 36, ${0.4 + Math.random() * 0.3}) 0%, transparent 70%)`,
        animation: `particleRise ${8 + Math.random() * 6}s ease-in infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    const quoteInterval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % LITERARY_QUOTES.length);
    }, 5000);
    return () => clearInterval(quoteInterval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage('Account created! Signing you in...');
        // Auto sign-in after sign-up (if email confirmation is disabled)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!signInError) {
          router.push('/library');
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/library');
        router.refresh();
      }
    } catch (err: unknown) {
      const authError = err as { message: string };
      setError(authError.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0c0a1a 0%, #1a1035 30%, #12101f 60%, #0a0a14 100%)',
      }}
    >
      {/* Animated background — bookshelf silhouette gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Warm glow behind the bookmark */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '600px',
            height: '700px',
            background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.08) 0%, rgba(139, 92, 246, 0.04) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Floating golden particles */}
        {mounted && Array.from({ length: 15 }).map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 0.8}
            x={10 + Math.random() * 80}
            size={3 + Math.random() * 5}
          />
        ))}
        {/* Subtle star dots */}
        {mounted && Array.from({ length: 30 }).map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full"
            style={{
              width: 1 + Math.random() * 2,
              height: 1 + Math.random() * 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: 'rgba(255,255,255,0.3)',
              animation: `twinkle ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Main bookmark container */}
      <div
        className={`relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{ perspective: '1000px' }}
      >
        {/* Tassel / Ribbon hanging from the top */}
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

        {/* The Bookmark Shape */}
        <div
          className="relative"
          style={{
            width: '380px',
            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
          }}
        >
          {/* Bookmark body */}
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
            {/* Gold edge shimmer */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.6), rgba(251,191,36,0.2), rgba(251,191,36,0.6), transparent)',
                animation: 'shimmerGold 3s ease-in-out infinite',
              }}
            />

            {/* Decorative corner flourishes */}
            <div className="absolute top-3 left-3 w-6 h-6 opacity-20"
              style={{ borderTop: '2px solid #fbbf24', borderLeft: '2px solid #fbbf24', borderRadius: '4px 0 0 0' }}
            />
            <div className="absolute top-3 right-3 w-6 h-6 opacity-20"
              style={{ borderTop: '2px solid #fbbf24', borderRight: '2px solid #fbbf24', borderRadius: '0 4px 0 0' }}
            />

            {/* Logo — custom SVG, no generic icons */}
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
                ✦ Your Story Awaits ✦
              </p>
            </div>

            {/* Tab switcher - 3D style */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(null); setMessage(null); }}
                className={`btn-3d flex-1 py-2.5 text-sm ${!isSignUp ? 'btn-3d-purple' : 'btn-3d-slate'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(null); setMessage(null); }}
                className={`btn-3d flex-1 py-2.5 text-sm ${isSignUp ? 'btn-3d-purple' : 'btn-3d-slate'}`}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                  style={{ color: 'rgba(251, 191, 36, 0.5)' }}
                />
                <input
                  id="email-input"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(251, 191, 36, 0.12)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                  style={{ color: 'rgba(251, 191, 36, 0.5)' }}
                />
                <input
                  id="password-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(251, 191, 36, 0.12)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {error && (
                <div
                  className="text-sm p-3 rounded-xl animate-fade-in flex items-center gap-2"
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <span>⚠</span> {error}
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
                  <span>✓</span> {message}
                </div>
              )}

              {/* 3D Submit Button */}
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
                    {isSignUp ? 'Begin Your Story' : 'Open Your Book'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bookmark V-notch bottom */}
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

        {/* Rotating literary quote */}
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

      {/* CSS animations */}
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
