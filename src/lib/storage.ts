import type { Book } from '@/types';
import { createClient } from '@/lib/supabase/server';

function stripLeadingSlash(value: string) {
  return value.replace(/^\/+/, '');
}

function extractStoragePath(value: string, bucket: string) {
  if (!value) return null;

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return stripLeadingSlash(value);
  }

  try {
    const url = new URL(value);
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
    ];

    for (const marker of markers) {
      const index = url.pathname.indexOf(marker);
      if (index >= 0) {
        return stripLeadingSlash(url.pathname.slice(index + marker.length));
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function createSignedAssetUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  value: string | null,
  expiresIn: number
) {
  if (!value) return null;

  const path = extractStoragePath(value, bucket);
  if (!path) {
    return value;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    console.error(`Failed to sign ${bucket} asset:`, error);
    return null;
  }

  return data.signedUrl;
}

export async function hydrateSignedBookAssets(book: Book) {
  const supabase = await createClient();
  const [epubUrl, coverUrl] = await Promise.all([
    createSignedAssetUrl(supabase, 'epubs', book.epub_file_url, 60 * 60),
    createSignedAssetUrl(supabase, 'covers', book.cover_url, 60 * 60),
  ]);

  return {
    ...book,
    epub_file_url: epubUrl || book.epub_file_url,
    cover_url: coverUrl,
  };
}
