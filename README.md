<div align="center">

<br />

```
  ✦  O N C E   U P O N   A   T I M E  ✦
```

### *A reader lives a thousand lives before he dies.*

**A cinematic, cloud-synced EPUB reader built for people who love books.**

<br />

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Storage-3ECF8E?style=for-the-badge&logo=supabase)
![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=for-the-badge&logo=tailwindcss)

<br />

</div>

---

## ✨ What is Once Upon A Time?

**Once Upon A Time** is a private, cloud-synced EPUB reading app with a cinematic UI. Upload your books, pick up right where you left off on any device, and lose yourself in a reading experience that feels truly alive — with ambience sounds, dynamic cover-art theming, highlights, bookmarks, and reading streak tracking.

It's not just a reader. It's a personal library.

---

## 🌟 Features

### 📚 Your Library
- **Cloud-synced bookshelf** — your collection is stored securely in Supabase Storage
- **3D book cards** with cover art, progress bars, and reading status at a glance
- **Dynamic ambient glow** — the library background shifts to match your hovered book cover
- **Reading stats** — total volumes, time read, active streak, and books in progress
- **Activity heatmap** — a GitHub-style calendar of your reading consistency over the past 6 months
- **Search, sort & filter** — find books by title or author; sort by newest, A–Z, or progress
- **Status tracking** — mark books as *Want to Read*, *Reading*, *Finished*, or *DNF*
- **Custom shelves** (tags), favorites, and inline metadata editing
- **Confetti burst** 🎉 when you mark a book as finished

### 📖 The Reader
- **Full EPUB rendering** via [epub.js](https://github.com/futurepress/epub.js)
- **Seamless progress sync** — your exact position (CFI) is saved to the cloud as you read
- **Cover-art color extraction** — the reader chrome adapts its accent color to your book's palette
- **5 built-in themes** — Dark, Sepia, Cream, Midnight, Solarized — plus a fully custom color picker
- **Font controls** — family, size, line height, and letter spacing
- **Ambience sounds** 🔊 — rain, forest, fireplace, café, ocean, and more
- **Page-turn sound effects** for an immersive tactile feel
- **Text highlighting & notes** — select any passage, add a note, and sync it to the cloud
- **Cloud bookmarks** — bookmark any page and jump back to it from the sidebar
- **In-book search** — full-text search across the entire EPUB
- **Dictionary lookup** — select a word to get its definition and phonetics instantly
- **Table of Contents** sidebar with chapter navigation
- **Keyboard shortcuts** for power readers
- **Auto-hiding controls** — the UI disappears while you read and reappears on mouse move
- **Pinnable toolbar** for those who prefer it always visible
- **Reading session tracking** — every session is logged for heatmap and streak calculation
- **Estimated time remaining** based on your personal reading pace

### 🔐 Auth & Security
- Supabase Auth with email/password, magic link, and password reset
- Protected routes via Next.js middleware (`/library`, `/read`)
- Strict security headers (CSP, X-Frame-Options, Permissions-Policy, etc.)
- Row-Level Security (RLS) enforced at the database layer — users can only access their own data

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, Lucide React |
| EPUB Engine | epub.js |
| Auth & Database | Supabase (PostgreSQL + RLS) |
| File Storage | Supabase Storage |
| Audio | Howler.js |
| Animations | canvas-confetti, CSS animations |
| Language | TypeScript 5 |

---

## 🗄️ Database Schema

The app uses three core tables, all with Row-Level Security:

```
books              — EPUB metadata, cover URLs, progress, reading status, tags
reading_sessions   — Per-session time logs for streak and heatmap calculation
highlights         — Cloud-synced highlights and notes (bookmarks stored separately)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### 1. Clone & Install

```bash
git clone https://github.com/raunak6531/Once-Upon-A-Time.git
cd Once-Upon-A-Time
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up the Database

Run the migrations in your Supabase SQL editor, in order:

```
supabase/migrations/202605100001_library_organization_stats.sql
supabase/migrations/202605100002_annotations_sync.sql
```

> Also create a **Supabase Storage bucket** named `books` (private) for EPUB files and cover images.

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel

```bash
npm i -g vercel
vercel
```

Add your environment variables in the Vercel Dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `←` / `→` | Previous / Next page |
| `T` | Toggle Table of Contents |
| `S` | Open Settings |
| `F` | Toggle fullscreen |
| `Ctrl/⌘ + F` | Open in-book search |
| `Escape` | Close sidebar / reveal controls |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── library/        # Main bookshelf page
│   ├── read/[id]/      # Per-book reader page
│   ├── login/          # Auth page
│   └── api/            # API routes
├── components/
│   ├── BookshelfLibrary.tsx   # Full library UI with heatmap & stats
│   ├── EpubReader.tsx         # epub.js wrapper component
│   ├── ReaderControls.tsx     # All reader chrome, toolbars & sidebar logic
│   ├── ReaderSidebar.tsx      # TOC, bookmarks, notes, search tabs
│   ├── SettingsPopover.tsx    # Theme, font & display settings
│   ├── AmbiencePopover.tsx    # Sound ambience controls
│   └── UploadModal.tsx        # Drag-and-drop EPUB upload
├── hooks/
│   ├── useBookProgress.ts     # CFI + progress cloud sync
│   ├── useReadingSession.ts   # Session recording for heatmap
│   ├── useReaderPreferences.ts # Per-book reader settings
│   ├── useAmbientSound.ts     # Background ambience playback
│   └── usePageTurnSound.ts    # Page-turn audio
└── lib/
    ├── supabase/        # Server & client Supabase helpers
    ├── annotations.ts   # Highlights & bookmarks CRUD
    ├── colorExtraction.ts # Cover art palette extraction
    ├── dictionary.ts    # Free Dictionary API integration
    └── storage.ts       # Signed URL helpers for book assets
```

---

<div align="center">

*Built with 📖 and a deep love for reading.*

</div>
