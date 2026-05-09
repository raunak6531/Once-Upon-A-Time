'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OUATLogo } from './OUATLogo';

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
      <div className="flex items-center gap-2">
        <OUATLogo size={32} />
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
