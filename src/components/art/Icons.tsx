/** Chunky, coloured navigation icons that match the toy pieces. All take a className for size. */

const base = (className?: string) => ({ viewBox: "0 0 100 100", className, "aria-hidden": true as const });

export function MapGlyph({ className }: { className?: string }) {
  return (
    <svg {...base(className)}>
      <path d="M12 26 L36 16 L64 26 L88 16 V74 L64 84 L36 74 L12 84 Z" fill="#2b1a4e" transform="translate(0 4)" opacity="0.5" />
      <path d="M12 26 L36 16 L64 26 L88 16 V74 L64 84 L36 74 L12 84 Z" fill="#fff5dc" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 16 V74 M64 26 V84" stroke="#e0c9a0" strokeWidth="3" />
      <path d="M18 70 Q30 50 36 56 T58 44 T84 30" fill="none" stroke="#f4a02c" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 9" />
      <circle cx="50" cy="50" r="10" fill="#ff4d6d" stroke="#fff" strokeWidth="3" />
      <circle cx="50" cy="50" r="4" fill="#fff" />
    </svg>
  );
}

export function ShopGlyph({ className }: { className?: string }) {
  return (
    <svg {...base(className)}>
      <path d="M22 36 H78 L84 86 H16 Z" fill="#2b1a4e" transform="translate(0 4)" opacity="0.5" />
      <path d="M22 36 H78 L84 86 H16 Z" fill="#ff7bb0" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <path d="M16 86 L22 36 H40 L36 86 Z" fill="#ff5a9d" />
      <path d="M36 44 V30 a14 14 0 0 1 28 0 v14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M28 44 H72" stroke="#fff" strokeWidth="3" opacity="0.7" />
      <circle cx="58" cy="64" r="8" fill="#fff" opacity="0.85" />
    </svg>
  );
}

export function FriendsGlyph({ className }: { className?: string }) {
  return (
    <svg {...base(className)}>
      <g transform="translate(0 4)" fill="#2b1a4e" opacity="0.5">
        <circle cx="34" cy="38" r="16" />
        <path d="M8 86 Q8 56 34 56 Q60 56 60 86 Z" />
      </g>
      <circle cx="68" cy="42" r="13" fill="#ffb347" stroke="#fff" strokeWidth="3" />
      <path d="M46 86 Q46 60 68 60 Q92 60 92 86 Z" fill="#ffb347" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="34" cy="38" r="16" fill="#5ec1ff" stroke="#fff" strokeWidth="3" />
      <path d="M8 86 Q8 56 34 56 Q60 56 60 86 Z" fill="#5ec1ff" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="29" cy="34" r="4" fill="#fff" opacity="0.7" />
    </svg>
  );
}

export function TrophyGlyph({ className }: { className?: string }) {
  return (
    <svg {...base(className)}>
      <path d="M30 14 H70 V40 A20 20 0 0 1 30 40 Z" fill="#2b1a4e" transform="translate(0 4)" opacity="0.5" />
      <path d="M30 20 Q12 20 12 36 Q12 50 30 52 M70 20 Q88 20 88 36 Q88 50 70 52" fill="none" stroke="#e39b1f" strokeWidth="7" strokeLinecap="round" />
      <path d="M30 14 H70 V40 A20 20 0 0 1 30 40 Z" fill="#ffcf4a" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 20 V38 A14 14 0 0 0 44 50" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <rect x="44" y="58" width="12" height="12" fill="#e39b1f" />
      <rect x="30" y="70" width="40" height="14" rx="4" fill="#ffcf4a" stroke="#fff" strokeWidth="3" />
      <path d="M50 24 L53.5 31 L61 32 L55.5 37 L57 44.5 L50 41 L43 44.5 L44.5 37 L39 32 L46.5 31 Z" fill="#fff" opacity="0.9" />
    </svg>
  );
}

export function GiftGlyph({ className }: { className?: string }) {
  return (
    <svg {...base(className)}>
      <rect x="16" y="42" width="68" height="44" rx="8" fill="#2b1a4e" transform="translate(0 4)" opacity="0.5" />
      <rect x="16" y="42" width="68" height="44" rx="8" fill="#ff5a9d" stroke="#fff" strokeWidth="3" />
      <rect x="10" y="30" width="80" height="18" rx="6" fill="#ff7bb0" stroke="#fff" strokeWidth="3" />
      <rect x="43" y="30" width="14" height="56" fill="#ffd166" />
      <path d="M50 30 C36 30 30 18 38 14 C44 11 50 20 50 30 C50 20 56 11 62 14 C70 18 64 30 50 30 Z" fill="#ffd166" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function GearGlyph({ className }: { className?: string }) {
  const teeth = Array.from({ length: 8 }, (_, i) => <rect key={i} x="44" y="8" width="12" height="18" rx="4" fill="#fff" transform={`rotate(${i * 45} 50 50)`} />);
  return (
    <svg {...base(className)}>
      {teeth}
      <circle cx="50" cy="50" r="28" fill="#fff" />
      <circle cx="50" cy="50" r="12" fill="#1f82ea" />
    </svg>
  );
}
