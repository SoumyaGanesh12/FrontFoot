export default function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#7C5CFC" />
          <stop offset="100%" stopColor="#C47A8A" />
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#lg1)" />
      {/* Lens shape */}
      <circle cx="18" cy="18" r="9" stroke="url(#lg2)" strokeWidth="2.5" fill="none" />
      <line x1="24.5" y1="24.5" x2="31" y2="31" stroke="url(#lg2)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Mini bar chart inside lens */}
      <rect x="13" y="19" width="3" height="4" rx="1" fill="#fff" opacity="0.7" />
      <rect x="17" y="15" width="3" height="8" rx="1" fill="#fff" opacity="0.85" />
      <rect x="21" y="17" width="3" height="6" rx="1" fill="#fff" opacity="0.7" />
    </svg>
  );
}
