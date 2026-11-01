import { memo } from "react";
import type { DecorKind } from "@/lib/worlds";

/** Mix a hex colour towards black (k < 0) or white (k > 0). */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
  return `#${((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, "0")}`;
}

/** One scenery prop, drawn in a 100×100 box and standing on its bottom edge. */
export const Decor = memo(function Decor({ kind, color, className }: { kind: DecorKind; color: string; className?: string }) {
  const dark = shade(color, -0.3);
  const light = shade(color, 0.35);
  let body: React.ReactNode;
  switch (kind) {
    case "tree":
      body = (
        <g>
          <rect x="44" y="60" width="12" height="40" rx="5" fill="#7a4a24" />
          <circle cx="50" cy="42" r="28" fill={color} />
          <circle cx="30" cy="56" r="18" fill={color} />
          <circle cx="70" cy="56" r="18" fill={color} />
          <circle cx="40" cy="32" r="12" fill={light} opacity="0.6" />
        </g>
      );
      break;
    case "pine":
      body = (
        <g>
          <rect x="45" y="78" width="10" height="22" rx="4" fill="#5c3a1e" />
          <path d="M50 4 L82 46 H62 L86 80 H14 L38 46 H18 Z" fill={color} />
          <path d="M50 4 L82 46 H62 L74 62 H50 Z" fill={light} opacity="0.35" />
          <path d="M14 80 L38 46 H44 L26 80 Z" fill={dark} opacity="0.4" />
        </g>
      );
      break;
    case "bush":
      body = (
        <g>
          <ellipse cx="50" cy="76" rx="46" ry="24" fill={color} />
          <circle cx="30" cy="66" r="20" fill={color} />
          <circle cx="62" cy="60" r="24" fill={color} />
          <circle cx="56" cy="52" r="12" fill={light} opacity="0.5" />
          <ellipse cx="50" cy="98" rx="40" ry="5" fill="#000" opacity="0.15" />
        </g>
      );
      break;
    case "flowers":
      body = (
        <g>
          {[
            [20, "#ff5a9d"],
            [50, "#ffd166"],
            [80, "#ff8fab"],
          ].map(([x, c], i) => (
            <g key={i} transform={`translate(${x} 0)`}>
              <path d="M0 100 C-4 80 4 70 0 56" stroke={dark} strokeWidth="5" fill="none" strokeLinecap="round" />
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="0" cy="44" rx="8" ry="13" fill={c as string} transform={`rotate(${a} 0 56)`} />
              ))}
              <circle cx="0" cy="56" r="7" fill="#fff6c9" />
            </g>
          ))}
        </g>
      );
      break;
    case "rock":
      body = (
        <g>
          <path d="M10 96 L18 60 L40 44 L70 46 L92 70 L90 96 Z" fill={shade("#9a9ab0", -0.1)} />
          <path d="M18 60 L40 44 L70 46 L60 62 L30 68 Z" fill={shade("#9a9ab0", 0.3)} />
          <path d="M60 62 L70 46 L92 70 L90 96 L62 96 Z" fill={shade("#9a9ab0", -0.35)} />
        </g>
      );
      break;
    case "crystal":
      body = (
        <g>
          <path d="M50 2 L74 40 L66 98 H34 L26 40 Z" fill="#8ad4ff" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M50 2 L26 40 L34 98 H46 L42 40 Z" fill="#c9edff" opacity="0.8" />
          <path d="M58 40 L74 40 L66 98 H60 Z" fill="#3b8fe0" opacity="0.6" />
          <path d="M22 70 L34 56 L36 98 H20 Z" fill="#b088ff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <path d="M78 74 L66 60 L64 98 H80 Z" fill="#ff8fd0" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </g>
      );
      break;
    case "mushroom":
      body = (
        <g>
          <rect x="38" y="54" width="24" height="46" rx="10" fill="#fff1d6" stroke="#d9b58a" strokeWidth="2" />
          <path d="M8 58 Q8 14 50 14 Q92 14 92 58 Z" fill="#ff4d4d" />
          <circle cx="32" cy="36" r="7" fill="#fff" />
          <circle cx="60" cy="28" r="6" fill="#fff" />
          <circle cx="74" cy="46" r="5" fill="#fff" />
          <ellipse cx="50" cy="58" rx="42" ry="6" fill="#c92a2a" />
        </g>
      );
      break;
    case "cactus":
      body = (
        <g>
          <rect x="40" y="20" width="20" height="80" rx="10" fill="#4caf50" stroke="#2e7d32" strokeWidth="2.5" />
          <path d="M40 60 H26 Q18 60 18 52 V40" fill="none" stroke="#2e7d32" strokeWidth="14" strokeLinecap="round" />
          <path d="M40 60 H26 Q20 60 20 52 V40" fill="none" stroke="#4caf50" strokeWidth="9" strokeLinecap="round" />
          <path d="M60 46 H74 Q82 46 82 38 V28" fill="none" stroke="#2e7d32" strokeWidth="14" strokeLinecap="round" />
          <path d="M60 46 H74 Q80 46 80 38 V28" fill="none" stroke="#4caf50" strokeWidth="9" strokeLinecap="round" />
          <circle cx="50" cy="16" r="7" fill="#ff6fa8" />
        </g>
      );
      break;
    case "palm":
      body = (
        <g>
          <path d="M50 100 Q46 60 56 28" stroke="#9a6a3a" strokeWidth="9" fill="none" strokeLinecap="round" />
          {[-70, -30, 10, 50, 90].map((a) => (
            <path key={a} d="M56 28 q24 -12 40 10 q-24 -4 -40 -10" fill={color} transform={`rotate(${a} 56 28)`} />
          ))}
          <circle cx="52" cy="34" r="5" fill="#7a4a24" />
          <circle cx="62" cy="36" r="5" fill="#7a4a24" />
        </g>
      );
      break;
    case "shell":
      body = (
        <g>
          <path d="M50 90 L10 50 Q10 14 50 14 Q90 14 90 50 Z" fill="#ffd9b8" stroke="#e39b6a" strokeWidth="2.5" strokeLinejoin="round" />
          {[-40, -20, 0, 20, 40].map((a) => (
            <path key={a} d="M50 90 L50 16" stroke="#e39b6a" strokeWidth="2.5" transform={`rotate(${a} 50 90)`} opacity="0.6" />
          ))}
        </g>
      );
      break;
    case "snowpile":
      body = (
        <g>
          <ellipse cx="50" cy="80" rx="48" ry="20" fill="#fff" />
          <circle cx="34" cy="66" r="22" fill="#fff" />
          <circle cx="66" cy="62" r="26" fill="#fff" />
          <ellipse cx="60" cy="52" rx="12" ry="7" fill="#dff1ff" opacity="0.8" />
          <ellipse cx="50" cy="98" rx="44" ry="5" fill="#8fbce0" opacity="0.4" />
        </g>
      );
      break;
    case "lantern":
      body = (
        <g>
          <rect x="47" y="30" width="6" height="70" fill="#4a3a5c" />
          <rect x="34" y="12" width="32" height="34" rx="6" fill="#ffd166" stroke="#4a3a5c" strokeWidth="3" />
          <rect x="30" y="6" width="40" height="8" rx="3" fill="#4a3a5c" />
          <circle cx="50" cy="29" r="9" fill="#fff6c9" />
          <circle cx="50" cy="29" r="22" fill="#ffd166" opacity="0.22" />
        </g>
      );
      break;
    case "lava":
      body = (
        <g>
          <path d="M6 100 L30 54 L50 68 L68 44 L94 100 Z" fill="#5a2a22" />
          <path d="M34 100 L50 72 L62 84 L72 100 Z" fill="#ff7a1f" />
          <path d="M44 100 L52 86 L60 100 Z" fill="#ffd166" />
          <circle cx="56" cy="58" r="4" fill="#ffb347" />
          <circle cx="40" cy="80" r="3" fill="#ff7a1f" />
        </g>
      );
      break;
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {body}
    </svg>
  );
});
