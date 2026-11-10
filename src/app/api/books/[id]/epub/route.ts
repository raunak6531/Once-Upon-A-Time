import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractStoragePath } from '@/lib/storage';

export const dynamic = 'force-dynamic';

interface BookEpubRouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: BookEpubRouteProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('title, epub_file_url, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (bookError || !book?.epub_file_url) {
    return new Response('Book not found', { status: 404 });
  }

  // Build a stable ETag from book id + last updated timestamp
  const etag = `"${id}-${book.updated_at ?? 'v1'}"`;
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const epubPath = extractStoragePath(book.epub_file_url, 'epubs');

  if (!epubPath) {
    return new Response('EPUB file path is invalid', { status: 422 });
  }

  const { data: file, error: fileError } = await supabase.storage
    .from('epubs')
    .download(epubPath);

  if (fileError || !file) {
    console.error('Failed to download EPUB:', fileError);
    return new Response('EPUB file could not be loaded', { status: 404 });
  }

  return new Response(file, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="${book.title || 'book'}.epub"`,
      'Content-Length': file.size.toString(),
      'Content-Type': 'application/epub+zip',
      'ETag': etag,
    },
  });
}
