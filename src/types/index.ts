export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  epub_file_url: string;
  current_cfi: string | null;
  setting_location?: string | null;
  setting_lat?: number | null;
  setting_lng?: number | null;
  created_at: string;
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
