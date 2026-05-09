/**
 * Custom SVG logo for "Once Upon A Time"
 * A stylized open book with a quill and sparkle — hand-crafted, not from any icon library.
 */
export function OUATLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} logo-shimmer`}
    >
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fbbf24" />
          <animate
            attributeName="x1"
            values="0%;100%;0%"
            dur="3s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      {/* Book body — left page */}
      <path
        d="M8 18C8 16 10 14 14 14C18 14 28 15 31 16V50C28 49 18 48 14 48C10 48 8 49 8 49V18Z"
        fill="rgba(255,255,255,0.15)"
        stroke="url(#goldGradient)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Book body — right page */}
      <path
        d="M56 18C56 16 54 14 50 14C46 14 36 15 33 16V50C36 49 46 48 50 48C54 48 56 49 56 49V18Z"
        fill="rgba(255,255,255,0.1)"
        stroke="url(#goldGradient)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Book spine */}
      <path
        d="M32 16V50"
        stroke="url(#goldGradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Text lines on left page */}
      <line x1="13" y1="22" x2="27" y2="23" stroke="rgba(251, 191, 36, 0.3)" strokeWidth="1" strokeLinecap="round" />
      <line x1="13" y1="26" x2="25" y2="27" stroke="rgba(251, 191, 36, 0.2)" strokeWidth="1" strokeLinecap="round" />
      <line x1="13" y1="30" x2="26" y2="31" stroke="rgba(251, 191, 36, 0.15)" strokeWidth="1" strokeLinecap="round" />
      {/* Quill pen — rising from the book */}
      <path
        d="M42 8C42 8 38 18 37 24C36 28 37 32 38 34"
        stroke="#fbbf24"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Quill feather */}
      <path
        d="M42 8C44 6 48 4 50 6C52 8 48 12 44 12C42 12 42 10 42 8Z"
        fill="#fbbf24"
        opacity="0.9"
      />
      {/* Magic Sparkles */}
      <g>
        <circle cx="46" cy="14" r="1.5" fill="white">
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
          <animate attributeName="r" values="1.5;2;1.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="40" cy="6" r="1" fill="#fbbf24">
          <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="10" r="0.8" fill="white">
          <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}
