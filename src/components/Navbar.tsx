'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <nav
      className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--theme-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          }}
        >
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <h1
          className="text-lg font-bold"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--theme-text)' }}
        >
          Once Upon A Time
        </h1>
      </div>

      <button
        id="logout-btn"
        onClick={handleLogout}
        className="btn-ghost"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </nav>
  );
}
