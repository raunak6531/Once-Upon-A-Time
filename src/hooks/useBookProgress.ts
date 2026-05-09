'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { debounce } from '@/lib/utils';

export function useBookProgress(bookId: string, initialCfi: string | null) {
  const [currentCfi, setCurrentCfi] = useState<string | null>(initialCfi);
  const supabase = createClient();
  const savingRef = useRef(false);

  // Create a debounced save function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(async (cfi: string) => {
      if (savingRef.current) return;
      savingRef.current = true;

      try {
        await supabase
          .from('books')
          .update({ current_cfi: cfi })
          .eq('id', bookId);
      } catch (err) {
        console.error('Failed to save reading progress:', err);
      } finally {
        savingRef.current = false;
      }
    }, 2000),
    [bookId]
  );

  const saveCfi = useCallback(
    (cfi: string) => {
      setCurrentCfi(cfi);
      debouncedSave(cfi);
    },
    [debouncedSave]
  );

  // Save on unmount if there's a pending CFI
  useEffect(() => {
    return () => {
      if (currentCfi) {
        // Fire and forget — save the last known position
        supabase
          .from('books')
          .update({ current_cfi: currentCfi })
          .eq('id', bookId)
          .then(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { currentCfi, saveCfi };
}
