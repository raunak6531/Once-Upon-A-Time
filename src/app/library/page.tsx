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

  const { data: highlightRows, error: highlightsError } = await supabase
    .from('highlights')
    .select('book_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to fetch books:', error);
  }

  if (sessionsError) {
    console.error('Failed to fetch reading sessions:', sessionsError);
  }

  if (highlightsError) {
    console.error('Failed to fetch note counts:', highlightsError);
  }

  const signedBooks = await Promise.all(((books as Book[]) || []).map(hydrateSignedBookAssets));
  const noteCounts = ((highlightRows as Array<{ book_id: string }> | null) || []).reduce<Record<string, number>>(
    (counts, row) => ({
      ...counts,
      [row.book_id]: (counts[row.book_id] || 0) + 1,
    }),
    {}
  );

  return <LibraryView books={signedBooks} sessions={(sessions as ReadingSession[]) || []} noteCounts={noteCounts} />;
}
