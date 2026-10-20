export function Logo({ size = 72 }: {
    size?: number;
}) {
    return (<svg width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669"/>
          <stop offset="100%" stopColor="#047857"/>
        </linearGradient>
      </defs>
      <rect width="72" height="72" rx="20" fill="url(#logoGrad)"/>
      <path d="M46 25.5A15 15 0 1 0 46 46.5" stroke="#fff" strokeWidth="5.5" strokeLinecap="round"/>
      <circle cx="49" cy="36" r="3.6" fill="#34D399"/>
    </svg>);
}
