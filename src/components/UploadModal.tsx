'use client';

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import type { Book } from '@/types';

interface UploadModalProps {
  onClose: () => void;
  onUploadComplete: (book: Book) => void;
}

type UploadStep = 'select' | 'uploading-epub' | 'parsing' | 'uploading-cover' | 'saving' | 'done' | 'error';

const stepLabels: Record<UploadStep, string> = {
  select: 'Select a file',
  'uploading-epub': 'Uploading EPUB file...',
  parsing: 'Extracting metadata...',
  'uploading-cover': 'Uploading cover image...',
  saving: 'Saving to library...',
  done: 'Book added!',
  error: 'Upload failed',
};

export default function UploadModal({ onClose, onUploadComplete }: UploadModalProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.epub')) {
      setFile(droppedFile);
    } else {
      setError('Please upload a .epub file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    try {
      // Step 1: Upload EPUB to Storage
      setStep('uploading-epub');
      setProgress(15);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const epubPath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: epubError } = await supabase.storage
        .from('epubs')
        .upload(epubPath, file, { contentType: 'application/epub+zip' });

      if (epubError) throw new Error(`EPUB upload failed: ${epubError.message}`);

      const { data: epubUrlData } = supabase.storage
        .from('epubs')
        .getPublicUrl(epubPath);
      const epubFileUrl = epubUrlData.publicUrl;

      setProgress(35);

      // Step 2: Parse EPUB for metadata
      setStep('parsing');
      const ePub = await import('epubjs');
      const arrayBuffer = await file.arrayBuffer();
      const book = ePub.default(arrayBuffer);
      await book.ready;

      const metadata = await book.loaded.metadata;
      const title = metadata.title || 'Untitled';
      const author = metadata.creator || 'Unknown Author';

      setProgress(55);

      // Step 3: Extract cover and upload
      setStep('uploading-cover');
      let coverUrl: string | null = null;

      try {
        const coverUrlFromBook = await book.coverUrl();
        if (coverUrlFromBook) {
          const response = await fetch(coverUrlFromBook);
          const blob = await response.blob();
          const coverPath = `${user.id}/${Date.now()}-cover.jpg`;

          const { error: coverError } = await supabase.storage
            .from('covers')
            .upload(coverPath, blob, { contentType: blob.type || 'image/jpeg' });

          if (!coverError) {
            const { data: coverUrlData } = supabase.storage
              .from('covers')
              .getPublicUrl(coverPath);
            coverUrl = coverUrlData.publicUrl;
          }
        }
      } catch (coverErr) {
        console.warn('Cover extraction failed, continuing without cover:', coverErr);
      }

      setProgress(75);

      // Step 4: Save to database
      setStep('saving');
      const { data: newBook, error: dbError } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title,
          author,
          cover_url: coverUrl,
          epub_file_url: epubFileUrl,
        })
        .select()
        .single();

      if (dbError) throw new Error(`Database save failed: ${dbError.message}`);

      setProgress(100);
      setStep('done');

      // Clean up the book
      book.destroy();

      setTimeout(() => {
        onUploadComplete(newBook as Book);
      }, 1000);

    } catch (err: unknown) {
      console.error('Upload error:', err);
      const uploadError = err as { message: string };
      setError(uploadError.message || 'Upload failed');
      setStep('error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--theme-text)' }}
          >
            Add a Book
          </h3>
          <button
            id="close-upload-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status */}
        {step !== 'select' && step !== 'error' && (
          <div className="mb-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              {step === 'done' ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--theme-accent)' }} />
              )}
              <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                {stepLabels[step]}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* File Selection */}
        {step === 'select' && (
          <>
            <div
              className={`upload-zone ${dragOver ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".epub"
                onChange={handleFileSelect}
                className="hidden"
                id="epub-file-input"
              />
              <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--theme-muted)' }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                Drop your EPUB here or click to browse
              </p>
              <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                Supports .epub files up to 50MB
              </p>
            </div>

            {file && (
              <div
                className="mt-4 p-3 rounded-xl flex items-center gap-3 animate-fade-in"
                style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
              >
                <FileText className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-accent)' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-text)' }}>
                    {file.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div
                className="mt-4 p-3 rounded-xl text-sm animate-fade-in"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {error}
              </div>
            )}

            <button
              id="start-upload-btn"
              onClick={handleUpload}
              disabled={!file}
              className="btn-accent w-full mt-5 justify-center"
            >
              <Upload className="w-4 h-4" />
              Upload & Add to Library
            </button>
          </>
        )}

        {/* Error state */}
        {step === 'error' && (
          <div className="animate-fade-in">
            <div
              className="p-4 rounded-xl mb-4"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <p className="text-sm" style={{ color: '#f87171' }}>
                {error || 'Something went wrong during upload.'}
              </p>
            </div>
            <button
              onClick={() => { setStep('select'); setError(null); setProgress(0); }}
              className="btn-accent w-full justify-center"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
