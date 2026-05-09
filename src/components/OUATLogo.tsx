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
      className={className}
    >
      {/* Book body — left page */}
      <path
        d="M8 18C8 16 10 14 14 14C18 14 28 15 31 16V50C28 49 18 48 14 48C10 48 8 49 8 49V18Z"
        fill="rgba(255,255,255,0.15)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Book body — right page */}
      <path
        d="M56 18C56 16 54 14 50 14C46 14 36 15 33 16V50C36 49 46 48 50 48C54 48 56 49 56 49V18Z"
        fill="rgba(255,255,255,0.1)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Book spine */}
      <path
        d="M32 16V50"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Text lines on left page */}
      <line x1="13" y1="22" x2="27" y2="23" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" />
      <line x1="13" y1="26" x2="25" y2="27" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeLinecap="round" />
      <line x1="13" y1="30" x2="26" y2="31" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
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
      <path
        d="M42 8C43 7 46 5 48 6"
        stroke="rgba(180,130,0,0.6)"
        strokeWidth="0.8"
        fill="none"
      />
      {/* Sparkle / star — the magic */}
      <g>
        <circle cx="46" cy="14" r="1.5" fill="white" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="40" cy="6" r="1" fill="#fbbf24" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="10" r="0.8" fill="white" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
      </g>
      {/* Four-point star sparkle */}
      <path
        d="M48 16L49 14L50 16L49 18Z"
        fill="white"
        opacity="0.6"
      >
        <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1.8s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}
