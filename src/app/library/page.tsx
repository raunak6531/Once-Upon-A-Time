import { createClient } from '@/lib/supabase/server';
import { hydrateSignedBookAssets } from '@/lib/storage';
import { redirect } from 'next/navigation';
import type { Book, ReadingSession } from '@/types';
import LibraryView from '@/components/LibraryView';

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

  const { data: sessions, error: sessionsError } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(180);

  if (error) {
    console.error('Failed to fetch books:', error);
  }

  if (sessionsError) {
    console.error('Failed to fetch reading sessions:', sessionsError);
  }

  const signedBooks = await Promise.all(((books as Book[]) || []).map(hydrateSignedBookAssets));

  return <LibraryView books={signedBooks} sessions={(sessions as ReadingSession[]) || []} />;
}
