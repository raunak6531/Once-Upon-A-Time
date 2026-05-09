import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Book } from '@/types';

import ReaderControls from '@/components/ReaderControls';

interface ReadPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ReadPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: book } = await supabase
    .from('books')
    .select('title, author')
    .eq('id', id)
    .single();

  return {
    title: book ? `${book.title} — Once Upon A Time` : 'Reading — Once Upon A Time',
    description: book ? `Reading "${book.title}" by ${book.author}` : 'Reading an EPUB book',
  };
}

export default async function ReadPage({ params }: ReadPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !book) {
    notFound();
  }

  const typedBook = book as Book;

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <ReaderControls
        bookId={typedBook.id}
        bookTitle={typedBook.title}
        epubUrl={typedBook.epub_file_url}
        initialCfi={typedBook.current_cfi}
        coverUrl={typedBook.cover_url}
      />
    </div>
  );
}
