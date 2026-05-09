import { createClient } from './supabase/client';
import { ReaderBookmark, ReaderHighlight } from '@/types';

const supabase = createClient();

export async function fetchAnnotations(bookId: string) {
  const [bookmarksRes, highlightsRes] = await Promise.all([
    supabase
      .from('bookmarks')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false }),
    supabase
      .from('highlights')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
  ]);

  if (bookmarksRes.error) throw bookmarksRes.error;
  if (highlightsRes.error) throw highlightsRes.error;

  const bookmarks: ReaderBookmark[] = bookmarksRes.data.map(b => ({
    id: b.id,
    cfi: b.cfi,
    label: b.label || 'Bookmark',
    date: b.created_at
  }));

  const highlights: ReaderHighlight[] = highlightsRes.data.map(h => ({
    id: h.id,
    cfi: h.cfi,
    text: h.text,
    note: h.note || '',
    chapter: h.chapter || 'Unknown',
    date: h.created_at
  }));

  return { bookmarks, highlights };
}

export async function saveBookmark(bookId: string, bookmark: Omit<ReaderBookmark, 'id' | 'date'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('bookmarks')
    .insert({
      book_id: bookId,
      user_id: user.id,
      cfi: bookmark.cfi,
      label: bookmark.label
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    cfi: data.cfi,
    label: data.label,
    date: data.created_at
  } as ReaderBookmark;
}

export async function deleteBookmark(id: string) {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function saveHighlight(bookId: string, highlight: Omit<ReaderHighlight, 'id' | 'date'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('highlights')
    .insert({
      book_id: bookId,
      user_id: user.id,
      cfi: highlight.cfi,
      text: highlight.text,
      note: highlight.note,
      chapter: highlight.chapter
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    cfi: data.cfi,
    text: data.text,
    note: data.note,
    chapter: data.chapter,
    date: data.created_at
  } as ReaderHighlight;
}

export async function deleteHighlight(id: string) {
  const { error } = await supabase
    .from('highlights')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateHighlightNote(id: string, note: string) {
  const { error } = await supabase
    .from('highlights')
    .update({ note })
    .eq('id', id);

  if (error) throw error;
}
