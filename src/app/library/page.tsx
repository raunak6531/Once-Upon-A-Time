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

  const [
    { data: books, error },
    { data: sessions, error: sessionsError },
    { data: highlightRows, error: highlightsError },
  ] = await Promise.all([
    supabase
      .from('books')
      .select('id,user_id,title,author,cover_url,epub_file_url,current_cfi,reading_status,is_favorite,tags,progress_percent,last_read_at,finished_at,total_reading_seconds,setting_location,setting_lat,setting_lng,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('reading_sessions')
      .select('id,user_id,book_id,started_at,ended_at,duration_seconds,progress_start,progress_end')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(180),
    supabase
      .from('highlights')
      .select('book_id')
      .eq('user_id', user.id),
  ]);

  if (error) {
    console.error('Failed to fetch books:', error);
  }

  if (sessionsError) {
    console.error('Failed to fetch reading sessions:', sessionsError);
  }

  if (highlightsError) {
    console.error('Failed to fetch note counts:', highlightsError);
  }

  const signedBooks = await Promise.all(((books as Book[]) || []).map((book) => hydrateSignedBookAssets(book, supabase)));

  const noteCounts: Record<string, number> = {};
  for (const row of (highlightRows as Array<{ book_id: string }> | null) || []) {
    noteCounts[row.book_id] = (noteCounts[row.book_id] || 0) + 1;
  }

  return <LibraryView books={signedBooks} sessions={(sessions as ReadingSession[]) || []} noteCounts={noteCounts} />;
}
