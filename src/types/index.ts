export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  epub_file_url: string;
  current_cfi: string | null;
  reading_status?: ReadingStatus | null;
  is_favorite?: boolean | null;
  tags?: string[] | null;
  progress_percent?: number | null;
  last_read_at?: string | null;
  finished_at?: string | null;
  total_reading_seconds?: number | null;
  setting_location?: string | null;
  setting_lat?: number | null;
  setting_lng?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export type ReadingStatus = 'want_to_read' | 'reading' | 'finished' | 'dnf';

export interface ReadingSession {
  id: string;
  user_id: string;
  book_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  progress_start: number | null;
  progress_end: number | null;
}

export interface ReaderSettings {
  theme: 'dark' | 'sepia' | 'cream' | 'midnight' | 'solarized' | 'custom';
  fontFamily: 'serif' | 'sans' | 'mono' | 'publisher';
  fontSize: number;
  lineHeight: 'compact' | 'normal' | 'relaxed';
  margin: 'narrow' | 'normal' | 'wide';
  customBg?: string;
  customText?: string;
}

export interface ReaderPreferences {
  settings: ReaderSettings;
  isPinned: boolean;
}

export interface ReaderBookmark {
  id: string;
  cfi: string;
  label: string;
  date: string;
}

export interface ReaderHighlight {
  id: string;
  cfi: string;
  text: string;
  note: string;
  chapter: string;
  date: string;
}

export interface ReaderSearchResult {
  id: string;
  cfi: string;
  excerpt: string;
  chapter: string;
  sectionIndex: number;
}

export interface TocEntry {
  href: string;
  label: string;
  subitems?: TocEntry[];
}
