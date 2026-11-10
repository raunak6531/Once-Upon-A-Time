import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LandingAuthForm from '@/components/LandingAuthForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: Promise<{
    email?: string;
    mode?: 'sign-in' | 'sign-up' | 'forgot-password';
    error?: string;
  }>;
}

export default async function LandingPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/library');
  }

  const params = searchParams ? await searchParams : {};
  const initialEmail = typeof params.email === 'string' ? params.email : '';
  const initialMode =
    params.mode === 'sign-in' || params.mode === 'forgot-password' ? params.mode : 'sign-up';
  const initialError =
    params.error === 'auth_callback_failed'
      ? 'That link is no longer valid. Please try again.'
      : null;

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans overflow-x-hidden">
      {/* Background radial glow behind hero */}
      <div
        className="hero-glow-drift absolute top-0 left-0 right-0 h-[1100px] pointer-events-none"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 38%, rgba(228, 103, 47, 0.20), transparent 70%), radial-gradient(35% 30% at 90% 0%, rgba(232, 180, 90, 0.10), transparent 70%)',
        }}
      />

      <div className="relative max-w-[1200px] mx-auto px-6 sm:px-12">
        {/* Section 1: Nav */}
        <nav className="flex items-center justify-between h-[88px]">
          <a
            href="#"
            className="font-serif text-[22px] font-medium text-[var(--text)] tracking-tight hover:opacity-90 transition-opacity"
          >
            Once Upon A Time
          </a>
          <div className="flex items-center gap-6 sm:gap-8 text-sm text-[var(--muted)]">
            <a href="#reader" className="hidden md:inline hover:text-[var(--text)] transition-colors">
              The reader
            </a>
            <a href="#rooms" className="hidden md:inline hover:text-[var(--text)] transition-colors">
              Ambience
            </a>
            <a href="#themes" className="hidden md:inline hover:text-[var(--text)] transition-colors">
              Themes
            </a>
            <a
              href="#join"
              className="text-[var(--text)] hover:opacity-80 transition-opacity font-medium"
            >
              Sign in
            </a>
            <a
              href="#join"
              className="h-[38px] px-[18px] flex items-center justify-center rounded-[10px] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold hover:opacity-90 transition-opacity"
            >
              Get started
            </a>
          </div>
        </nav>

        {/* Section 2: Hero */}
        <header className="landing-reveal text-center py-20 sm:py-24">
          <p className="m-0 mb-7 text-xs tracking-[0.16em] uppercase text-[var(--accent)] font-medium">
            A private EPUB reader
          </p>
          <h1 className="m-0 mx-auto max-w-[900px] font-serif text-5xl sm:text-7xl lg:text-[96px] leading-[1.05] lg:leading-[1] font-normal tracking-[-0.03em] text-[var(--text)]">
            Your books, in a <em className="italic text-[var(--accent)] font-normal">quieter</em> room.
          </h1>
          <p className="mt-8 mx-auto max-w-[520px] text-base sm:text-lg leading-[1.6] text-[var(--muted)]">
            Upload your EPUBs once. Read anywhere, pick up on the exact line you left, and let the room take the colour of the cover.
          </p>

          <form
            id="hero-email-form"
            action="#join"
            method="GET"
            className="flex flex-col sm:flex-row gap-2.5 justify-center items-center mt-10 max-w-[540px] mx-auto w-full"
          >
            <input
              id="hero-email-input"
              name="email"
              type="email"
              aria-label="Email"
              placeholder="you@example.com"
              className="box-border w-full sm:w-[300px] h-[52px] px-4 rounded-[12px] border border-[rgba(255,240,220,0.14)] bg-[rgba(255,240,220,0.05)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
            />
            <button
              type="submit"
              className="w-full sm:w-auto h-[52px] px-6 rounded-[12px] bg-[var(--accent)] text-[var(--accent-ink)] text-[15px] font-semibold hover:opacity-90 transition-opacity cursor-pointer border-0 shadow-none whitespace-nowrap"
            >
              Create your library
            </button>
          </form>

          <p className="mt-4 text-[13px] text-[var(--muted)]">
            Free. Your files stay private to you.
          </p>
        </header>

        {/* Section 3: Reader Mockup */}
        <section id="reader" className="landing-reveal relative mx-auto mb-28 sm:mb-32 max-w-[1040px]">
          {/* Soft orange radial-gradient glow sitting behind the reader */}
          <div
            className="absolute -inset-10 sm:-inset-16 pointer-events-none"
            style={{
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(228, 103, 47, 0.22), transparent 70%)',
            }}
          />

          <div className="relative border border-[rgba(255,240,220,0.10)] rounded-[18px] bg-[#16120f] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Window toolbar */}
            <div className="flex justify-between items-center h-[52px] px-6 border-b border-[rgba(255,240,220,0.06)] text-[13px] text-[var(--muted)]">
              <span>Contents</span>
              <span className="font-serif text-[15px] text-[var(--text)]">The River Hours</span>
              <span>Aa &nbsp; Search</span>
            </div>

            {/* Two-column serif spread */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-[72px] px-6 py-10 md:px-[88px] md:pt-[64px] md:pb-[40px] font-serif text-[17px] md:text-[19px] leading-[1.75] text-[#d9d0c4] relative">
              <p className="m-0 flex-1">
                The river kept its own hours. By the time the lamps were lit along the ghats, the boatmen had learned which pilgrims would talk and which would only watch the water. Mira belonged to the second kind, and they left her alone, which was the kindest thing anyone had done in weeks.
              </p>
              <p className="m-0 flex-1 relative">
                She sat on the lowest step with her shoes in her lap.{' '}
                <span className="bg-[rgba(232,180,90,0.25)] border-b border-[var(--accent)] text-[#f3e9d6]">
                  Somewhere upstream a bell rang once and was forgotten
                </span>
                , and the current carried the sound down to her slowly, the way it carried everything.

                {/* Floating Highlight / Note / Define toolbar */}
                <span className="hidden sm:inline-flex absolute -top-12 left-6 gap-0.5 p-1 rounded-[10px] bg-[#efe8de] text-[#1a1208] text-[13px] font-medium shadow-[0_12px_30px_rgba(0,0,0,0.5)] z-10 whitespace-nowrap">
                  <span className="px-3 py-1.5 cursor-default">Highlight</span>
                  <span className="px-3 py-1.5 cursor-default">Note</span>
                  <span className="px-3 py-1.5 cursor-default">Define</span>
                </span>
              </p>
            </div>

            {/* Reader progress row */}
            <div className="flex items-center gap-4 px-6 pb-6 md:px-[88px] md:pb-[28px] text-[12px] text-[var(--muted)]">
              <span>38%</span>
              <div className="flex-1 h-[2px] bg-[rgba(255,240,220,0.12)] rounded-full overflow-hidden">
                <div className="w-[38%] h-[2px] bg-[var(--accent)]" />
              </div>
              <span>2h 14m left</span>
            </div>
          </div>
        </section>

        {/* Section 4: Three numbered features in 3-column grid */}
        <section className="landing-reveal grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 pb-28 md:pb-32">
          <div>
            <p className="m-0 mb-4 text-[13px] text-[var(--accent)] font-mono font-medium">01</p>
            <h3 className="m-0 mb-3 font-serif text-[28px] md:text-[30px] font-normal tracking-[-0.01em] text-[var(--text)]">
              Pick up on the exact line
            </h3>
            <p className="m-0 text-base leading-[1.65] text-[var(--muted)]">
              Progress syncs to the cloud as you read, so your phone, laptop and tablet always agree about where you are.
            </p>
          </div>

          <div>
            <p className="m-0 mb-4 text-[13px] text-[var(--accent)] font-mono font-medium">02</p>
            <h3 className="m-0 mb-3 font-serif text-[28px] md:text-[30px] font-normal tracking-[-0.01em] text-[var(--text)]">
              Marginalia that follows you
            </h3>
            <p className="m-0 text-base leading-[1.65] text-[var(--muted)]">
              Highlights, notes, bookmarks and dictionary lookups, all saved to your library and searchable later.
            </p>
          </div>

          <div>
            <p className="m-0 mb-4 text-[13px] text-[var(--accent)] font-mono font-medium">03</p>
            <h3 className="m-0 mb-3 font-serif text-[28px] md:text-[30px] font-normal tracking-[-0.01em] text-[var(--text)]">
              A streak worth keeping
            </h3>
            <p className="m-0 text-base leading-[1.65] text-[var(--muted)]">
              A calm heatmap of your reading days and an honest estimate of time left in the book.
            </p>
          </div>
        </section>

        {/* Section 5: Set the room */}
        <section
          id="rooms"
          className="landing-reveal flex flex-col md:flex-row gap-10 md:gap-20 items-start md:items-center pb-28 md:pb-32 border-t border-[var(--line)] pt-24"
        >
          <div className="flex-1">
            <h2 className="m-0 mb-5 font-serif text-4xl sm:text-5xl lg:text-[56px] leading-[1.05] font-normal tracking-[-0.02em] text-[var(--text)]">
              Set the room.
            </h2>
            <p className="m-0 text-base sm:text-[17px] leading-[1.65] text-[var(--muted)] max-w-[420px]">
              Rain on a window. A fire across the room. Mix the sounds you like, add a soft page-turn, and the app stays out of the way.
            </p>
          </div>

          <div className="flex-1 w-full flex flex-col gap-3">
            <div className="flex justify-between items-center h-[56px] px-5 border border-[rgba(232,180,90,0.5)] rounded-[12px] bg-[rgba(232,180,90,0.08)]">
              <span className="text-[15px] text-[var(--text)] font-medium">Rain</span>
              <span className="w-[120px] h-[2px] bg-[rgba(255,240,220,0.15)] rounded-full overflow-hidden">
                <span className="block w-[70%] h-[2px] bg-[var(--accent)]" />
              </span>
            </div>

            <div className="flex justify-between items-center h-[56px] px-5 border border-[rgba(255,240,220,0.10)] rounded-[12px]">
              <span className="text-[15px] text-[var(--muted)]">Fireplace</span>
              <span className="w-[120px] h-[2px] bg-[rgba(255,240,220,0.15)] rounded-full" />
            </div>

            <div className="flex justify-between items-center h-[56px] px-5 border border-[rgba(255,240,220,0.10)] rounded-[12px]">
              <span className="text-[15px] text-[var(--muted)]">Café</span>
              <span className="w-[120px] h-[2px] bg-[rgba(255,240,220,0.15)] rounded-full" />
            </div>

            <div className="flex justify-between items-center h-[56px] px-5 border border-[rgba(255,240,220,0.10)] rounded-[12px]">
              <span className="text-[15px] text-[var(--muted)]">Forest</span>
              <span className="w-[120px] h-[2px] bg-[rgba(255,240,220,0.15)] rounded-full" />
            </div>
          </div>
        </section>

        {/* Section 6: Five themes, or make your own */}
        <section id="themes" className="landing-reveal pb-28 md:pb-32">
          <h2 className="m-0 mb-10 font-serif text-3xl sm:text-[40px] font-normal tracking-[-0.02em] text-center text-[var(--text)]">
            Five themes, or make your own.
          </h2>
          <div className="flex flex-wrap gap-5 justify-center">
            {/* Dark */}
            <div className="w-[170px] h-[210px] rounded-[12px] bg-[#141418] border border-[rgba(255,240,220,0.10)] p-5 box-border flex flex-col justify-between">
              <span className="font-serif text-[44px] text-white">Aa</span>
              <span className="text-[13px] text-[#94a3b8]">Dark</span>
            </div>

            {/* Sepia */}
            <div className="w-[170px] h-[210px] rounded-[12px] bg-[#f4ecd8] p-5 box-border flex flex-col justify-between">
              <span className="font-serif text-[44px] text-[#2a1f14]">Aa</span>
              <span className="text-[13px] text-[#5b4636]">Sepia</span>
            </div>

            {/* Cream */}
            <div className="w-[170px] h-[210px] rounded-[12px] bg-[#fffaf0] p-5 box-border flex flex-col justify-between">
              <span className="font-serif text-[44px] text-[#1a1a1a]">Aa</span>
              <span className="text-[13px] text-[#666]">Cream</span>
            </div>

            {/* Midnight */}
            <div className="w-[170px] h-[210px] rounded-[12px] bg-[#000000] border border-[rgba(255,240,220,0.15)] p-5 box-border flex flex-col justify-between">
              <span className="font-serif text-[44px] text-white">Aa</span>
              <span className="text-[13px] text-[#a0a0a0]">Midnight</span>
            </div>

            {/* Solarized */}
            <div className="w-[170px] h-[210px] rounded-[12px] bg-[#073642] p-5 box-border flex flex-col justify-between">
              <span className="font-serif text-[44px] text-[#fdf6e3]">Aa</span>
              <span className="text-[13px] text-[#93a1a1]">Solarized</span>
            </div>
          </div>
        </section>

        {/* Section 7: #join */}
        <section
          id="join"
          className="landing-reveal relative mx-auto mb-24 max-w-[960px] flex flex-col md:flex-row border border-[var(--line)] rounded-[20px] bg-[var(--surface)] overflow-hidden"
        >
          {/* Subtle warm radial-gradient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(60% 80% at 0% 100%, rgba(228, 103, 47, 0.20), transparent 70%)',
            }}
          />

          {/* Quote side */}
          <div className="relative flex-1 p-8 sm:p-14 flex flex-col justify-between">
            <p className="m-0 font-serif italic text-2xl sm:text-4xl leading-[1.2] tracking-[-0.01em] text-[var(--text)]">
              &ldquo;A reader lives a thousand lives before he dies.&rdquo;
            </p>
            <p className="m-0 mt-8 text-sm text-[var(--muted)]">George R.R. Martin</p>
          </div>

          {/* Interactive client auth form */}
          <LandingAuthForm
            initialEmail={initialEmail}
            initialMode={initialMode}
            initialError={initialError}
          />
        </section>

        {/* Section 8: Footer */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-12 text-[13px] text-[var(--muted)]">
          <span className="font-serif text-base text-[var(--text)] font-medium">Once Upon A Time</span>
          <span>Made for people who finish books.</span>
        </footer>
      </div>

      {/* IntersectionObserver for optional 12px fade-up on viewport entry */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  if (typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.landing-reveal').forEach(function(el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll('.landing-reveal').forEach(function(el) {
      el.classList.add('is-visible');
    });
  }
})();
`,
        }}
      />
    </div>
  );
}
