import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Book } from '@/types';
import Navbar from '@/components/Navbar';
import BookGrid from '@/components/BookGrid';

export const metadata = {
  title: 'My Library — Once Upon A Time',
  description: 'Browse and manage your EPUB book collection.',
};

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch books:', error);
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--theme-bg)' }}
    >
      <Navbar />
      <BookGrid books={(books as Book[]) || []} />
    </div>
  );
}
