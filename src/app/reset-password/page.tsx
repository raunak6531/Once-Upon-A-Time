'use client';

import { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

async function postPassword(password: string, confirmPassword: string) {
  const response = await fetch('/api/auth/update-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({ password, confirmPassword }),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };

  if (!response.ok) {
    throw new Error(data.error || 'Could not update your password');
  }

  return data;
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await postPassword(password, confirmPassword);
      setMessage(data.message || 'Password updated.');
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'linear-gradient(135deg, #0c0a1a 0%, #1a1035 30%, #12101f 60%, #0a0a14 100%)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8"
        style={{
          background: 'linear-gradient(175deg, #1e1b30 0%, #171425 40%, #13111f 100%)',
          border: '1px solid rgba(251, 191, 36, 0.15)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        }}
      >
        <h1 className="text-3xl text-white mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
          Reset password
        </h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.58)' }}>
          Choose a fresh password for your library account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="sr-only">New password</span>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(251, 191, 36, 0.5)' }} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                placeholder="New password"
                className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(251, 191, 36, 0.12)',
                }}
              />
            </div>
          </label>

          <label className="block">
            <span className="sr-only">Confirm password</span>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(251, 191, 36, 0.5)' }} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
                placeholder="Confirm password"
                className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(251, 191, 36, 0.12)',
                }}
              />
            </div>
          </label>

          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.52)' }}>
            Use at least 8 characters with at least one letter and one number.
          </p>

          {error && (
            <div
              className="text-sm p-3 rounded-xl"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              className="text-sm p-3 rounded-xl"
              style={{
                background: 'rgba(34, 197, 94, 0.12)',
                color: '#86efac',
                border: '1px solid rgba(34, 197, 94, 0.2)',
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-3d btn-3d-amber w-full py-3.5 text-sm"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save new password'}
          </button>
        </form>

        <div className="mt-5 text-sm">
          <Link href="/login" className="text-amber-300 hover:text-amber-200 transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
