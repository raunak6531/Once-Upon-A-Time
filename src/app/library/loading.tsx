export default function LibraryLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--theme-bg)' }}>
      {/* Navbar skeleton */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="skeleton w-32 h-5 rounded" />
        </div>
        <div className="skeleton w-24 h-9 rounded-xl" />
      </div>

      {/* Content skeleton */}
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="skeleton w-40 h-7 rounded mb-2" />
            <div className="skeleton w-28 h-4 rounded" />
          </div>
          <div className="skeleton w-28 h-10 rounded-xl" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton rounded-2xl" style={{ aspectRatio: '2/3' }} />
              <div className="p-3.5">
                <div className="skeleton w-full h-4 rounded mb-2" />
                <div className="skeleton w-2/3 h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
