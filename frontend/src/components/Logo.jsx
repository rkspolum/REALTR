export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="36" height="36" rx="9" fill="url(#logoGrad)" />

      {/* Roof */}
      <path d="M18 6L32 19.5H4L18 6Z" fill="white" fillOpacity="0.92" />

      {/* House body */}
      <rect x="6.5" y="19" width="23" height="11.5" rx="1.5" fill="white" fillOpacity="0.92" />

      {/* Door */}
      <rect x="14.5" y="22" width="7" height="8.5" rx="1" fill="#2563eb" />

      {/* Left window */}
      <rect x="8.5" y="21" width="4" height="4" rx="0.75" fill="#93c5fd" />

      {/* Right window */}
      <rect x="23.5" y="21" width="4" height="4" rx="0.75" fill="#93c5fd" />

      {/* Upward trend line overlay */}
      <path
        d="M8 28.5L12.5 24.5L16.5 26.5L22 21.5L27 21.5"
        stroke="#bfdbfe"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Trend endpoint dot */}
      <circle cx="27" cy="21.5" r="1.8" fill="#bfdbfe" />
      {/* Upward arrow on trend */}
      <path
        d="M25 19L27 21.5L29 19"
        stroke="#bfdbfe"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
      </defs>
    </svg>
  );
}
