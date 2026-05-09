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
    <nav className="library-nav">
      <div className="library-nav-brand">
        <OUATLogo size={30} />
        <div className="library-nav-wordmark">
          <span className="library-nav-title">Once Upon A Time</span>
          <span className="library-nav-tagline">Personal Library</span>
        </div>
      </div>

      <button
        id="logout-btn"
        onClick={handleLogout}
        className="btn-3d btn-3d-slate library-nav-signout"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </nav>
  );
}
