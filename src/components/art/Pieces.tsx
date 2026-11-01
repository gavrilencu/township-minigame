import { memo, type ReactNode } from "react";
import type { BlockerKind, GoalKind, SpecialKind, Tile } from "@/lib/game/types";

/**
 * Toy-piece palette: chunky glossy shapes with an embossed symbol.
 * `depth` is the darkest tone (outline, score-popup stroke), `base/light/dark` drive the particles.
 */
export const GEM_COLORS = [
  { name: "Inimă", base: "#ea3d38", light: "#ff9a86", dark: "#ad1c1a", depth: "#5c0b0b" },
  { name: "Picătură", base: "#2f80f2", light: "#93d2ff", dark: "#1a4db3", depth: "#0b2866" },
  { name: "Soare", base: "#ffc62a", light: "#fff2a8", dark: "#df8e07", depth: "#874b00" },
  { name: "Frunză", base: "#41bd3e", light: "#a3ee8a", dark: "#1f7f24", depth: "#0c4511" },
  { name: "Fulg", base: "#e4eaf5", light: "#ffffff", dark: "#a9b7d6", depth: "#55658b" },
  { name: "Lună", base: "#a354ea", light: "#dfb8ff", dark: "#6a28b4", depth: "#381064" },
];

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

const f = (n: number) => n.toFixed(1);

/** Regular polygon with rounded corners, as an SVG path. */
function roundPoly(sides: number, radius: number, corner: number, cx = 50, cy = 47, start = -90): string {
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = ((start + (i * 360) / sides) * Math.PI) / 180;
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
  });
  let d = "";
  for (let i = 0; i < sides; i++) {
    const p = pts[i];
    const prev = pts[(i + sides - 1) % sides];
    const next = pts[(i + 1) % sides];
    const to = (q: number[]) => {
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy);
      return [p[0] + (dx / len) * corner, p[1] + (dy / len) * corner];
    };
    const a = to(prev);
    const b = to(next);
    d += (i ? ` L${f(a[0])} ${f(a[1])}` : `M${f(a[0])} ${f(a[1])}`) + ` Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])}`;
  }
  return d + " Z";
}

const SHAPES = [
  "M31 8 H69 Q89 8 89 28 V66 Q89 86 69 86 H31 Q11 86 11 66 V28 Q11 8 31 8 Z", // rounded square
  "M10 47 A40 40 0 1 0 90 47 A40 40 0 1 0 10 47 Z", // circle
  roundPoly(6, 43, 9), // hexagon
  roundPoly(4, 45, 11), // diamond
  roundPoly(8, 42, 8, 50, 47, -90 + 22.5), // octagon
  roundPoly(5, 44, 10, 50, 49), // pentagon
];

const HEART =
  "M50 87 C23 70 9 55 11 37 C13 21 27 12 39 14 C45 15 49 19 50 24 C51 19 55 15 61 14 C73 12 87 21 89 37 C91 55 77 70 50 87 Z";
const DROP = "M50 8 C50 8 16 46 16 64 A34 34 0 0 0 84 64 C84 46 50 8 50 8 Z";
const LEAF = "M50 14 C76 20 90 46 78 70 C68 90 40 92 22 78 C8 66 10 40 28 24 C34 18 42 14 50 14 Z";
const MOON = "M60 16 A32 32 0 1 0 60 80 A40 40 0 0 1 60 16 Z";

/** Centre a 100×100 motif inside the piece at the given scale. */
const fit = (s: number, cy = 47) => `translate(${50 - 50 * s} ${cy - 50 * s}) scale(${s})`;

type Emblem = (color: string, opacity: number) => ReactNode;

const EMBLEMS: Emblem[] = [
  (c, o) => <path d={HEART} fill={c} opacity={o} transform={fit(0.44)} />,
  (c, o) => <path d={DROP} fill={c} opacity={o} transform={fit(0.42)} />,
  (c, o) => (
    <g fill={c} opacity={o}>
      <circle cx="50" cy="47" r="10" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="47.5" y="27" width="5" height="8" rx="2.5" transform={`rotate(${i * 45} 50 47)`} />
      ))}
    </g>
  ),
  (c, o) => (
    <g fill={c} opacity={o} transform={fit(0.44)}>
      <path d={LEAF} />
    </g>
  ),
  (c, o) => (
    <g stroke={c} strokeOpacity={o} fill="none" strokeWidth="5.5" strokeLinecap="round">
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a} 50 47)`}>
          <path d="M50 29 V65" />
          <path d="M44 34 L50 40 L56 34 M44 60 L50 54 L56 60" />
        </g>
      ))}
    </g>
  ),
  (c, o) => <path d={MOON} fill={c} opacity={o} transform={fit(0.42, 49)} />,
];

/** Where the big soft sheen sits for each shape. */
const SHEEN: [number, number, number, number][] = [
  [34, 28, 30, 22],
  [34, 28, 30, 22],
  [36, 26, 28, 20],
  [40, 24, 24, 20],
  [35, 27, 29, 21],
  [38, 28, 28, 20],
];

/* ------------------------------------------------------------------ */
/* Shared defs                                                         */
/* ------------------------------------------------------------------ */

/** Shared gradients and clip paths, rendered once per screen. */
export function GemDefs() {
  return (
    <svg id="gem-defs" width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        {GEM_COLORS.map((g, i) => (
          <radialGradient key={`b${i}`} id={`pBody${i}`} cx="0.34" cy="0.26" r="0.95">
            <stop offset="0" stopColor={g.light} />
            <stop offset="0.38" stopColor={g.base} />
            <stop offset="1" stopColor={g.dark} />
          </radialGradient>
        ))}
        {SHAPES.map((d, i) => (
          <clipPath key={`c${i}`} id={`pClip${i}`}>
            <path d={d} />
          </clipPath>
        ))}
        <radialGradient id="pSheen">
          <stop offset="0" stopColor="#fff" stopOpacity="0.62" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="pShadow">
          <stop offset="0" stopColor="#141a4d" stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#141a4d" stopOpacity="0.2" />
          <stop offset="1" stopColor="#141a4d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rocketBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9d8f" />
          <stop offset="0.4" stopColor="#f0392f" />
          <stop offset="1" stopColor="#a8151a" />
        </linearGradient>
        <linearGradient id="rocketNose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2a8" />
          <stop offset="0.5" stopColor="#ffc42a" />
          <stop offset="1" stopColor="#d98407" />
        </linearGradient>
        <linearGradient id="rocketFin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0ff" />
          <stop offset="0.5" stopColor="#2f80f2" />
          <stop offset="1" stopColor="#1a4db3" />
        </linearGradient>
        <radialGradient id="bombBody" cx="0.34" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#8e9cf0" />
          <stop offset="0.35" stopColor="#3a44a0" />
          <stop offset="1" stopColor="#0f1340" />
        </radialGradient>
        <linearGradient id="planeTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cfe6ff" />
        </linearGradient>
        <radialGradient id="ballShade" cx="0.34" cy="0.28" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#1a0b4a" stopOpacity="0.5" />
        </radialGradient>
        <clipPath id="ballClip">
          <circle cx="50" cy="48" r="40" />
        </clipPath>
        <linearGradient id="woodLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd28f" />
          <stop offset="1" stopColor="#e39a4a" />
        </linearGradient>
        <linearGradient id="woodDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c98a4d" />
          <stop offset="1" stopColor="#8d5527" />
        </linearGradient>
        <linearGradient id="hammerHead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.5" stopColor="#ff9a2e" />
          <stop offset="1" stopColor="#d9601c" />
        </linearGradient>
        <linearGradient id="grassFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fe066" />
          <stop offset="1" stopColor="#36a834" />
        </linearGradient>
        <radialGradient id="cloud1" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#ffd6ec" />
          <stop offset="1" stopColor="#f7a8d2" />
        </radialGradient>
        <radialGradient id="cloud2" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffe3f3" />
          <stop offset="0.55" stopColor="#ff9fd0" />
          <stop offset="1" stopColor="#e2559d" />
        </radialGradient>
        <linearGradient id="chainFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef1f8" />
          <stop offset="1" stopColor="#8d96b3" />
        </linearGradient>
        <linearGradient id="coinFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2a8" />
          <stop offset="0.5" stopColor="#ffc93c" />
          <stop offset="1" stopColor="#e08a00" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Base pieces                                                         */
/* ------------------------------------------------------------------ */

/** Soft contact shadow under a piece. */
const Shadow = ({ rx = 36, cy = 92 }: { rx?: number; cy?: number }) => <ellipse cx="51" cy={cy} rx={rx} ry="7" fill="url(#pShadow)" />;

/** A chunky, glossy toy piece: extruded base, bright sheen and an embossed symbol. */
function Piece({ color }: { color: number }) {
  const i = Math.min(Math.max(color, 0), GEM_COLORS.length - 1);
  const g = GEM_COLORS[i];
  const d = SHAPES[i];
  const emblem = EMBLEMS[i];
  const [sx, sy, srx, sry] = SHEEN[i];
  return (
    <>
      <Shadow />
      {/* extrusion: the thick darker bottom edge */}
      <path d={d} fill={g.depth} transform="translate(0 6)" />
      <path d={d} fill={g.dark} transform="translate(0 3.5)" />
      {/* body */}
      <path d={d} fill={`url(#pBody${i})`} />
      <g clipPath={`url(#pClip${i})`}>
        <ellipse cx={sx} cy={sy} rx={srx} ry={sry} fill="url(#pSheen)" />
        <path d={d} fill="url(#pRim)" />
      </g>
      <path d={d} fill="none" stroke={g.depth} strokeWidth="2.2" strokeOpacity="0.5" />
      {/* embossed symbol: light edge below, dark edge above, recessed floor */}
      <g transform="translate(0 2.2)">{emblem(g.light, 0.75)}</g>
      <g transform="translate(0 -1.6)">{emblem(g.depth, 0.75)}</g>
      {emblem(g.dark, 0.72)}
      {/* crisp glint */}
      <ellipse cx={sx - 8} cy={sy - 8} rx="9" ry="4.5" fill="#fff" opacity="0.85" transform={`rotate(-35 ${sx - 8} ${sy - 8})`} />
    </>
  );
}

/** Hidden copies of every piece, read by `lib/sprites.ts` to draw the board bitmaps. */
export function PieceSources() {
  return (
    <div className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden>
      {GEM_COLORS.map((_, i) => (
        <svg key={i} id={`piece-src-${i}`} viewBox="0 0 100 100" width="0" height="0">
          <Piece color={i} />
        </svg>
      ))}
    </div>
  );
}

export const Gem = memo(function Gem({ color, className }: { color: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <Piece color={color} />
    </svg>
  );
});

/* ------------------------------------------------------------------ */
/* Specials                                                            */
/* ------------------------------------------------------------------ */

function Rocket({ vertical }: { vertical: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <Shadow rx={vertical ? 26 : 38} />
      <g transform={vertical ? "rotate(-90 50 50)" : undefined}>
        <g className="rocket-shimmer">
          {/* flame */}
          <path d="M22 50 C14 40 4 44 2 50 C4 56 14 60 22 50 Z" fill="#ff9d1f" />
          <path d="M20 50 C15 45 10 47 8 50 C10 53 15 55 20 50 Z" fill="#fff0a0" />
          {/* fins */}
          <path d="M30 34 L14 22 L19 50 L14 78 L30 66 Z" fill="#0b2866" transform="translate(0 5)" />
          <path d="M30 34 L14 22 L19 50 L14 78 L30 66 Z" fill="url(#rocketFin)" stroke="#0b2866" strokeWidth="2.5" strokeLinejoin="round" />
          {/* body */}
          <rect x="22" y="37" width="58" height="34" rx="14" fill="#5c0b0b" />
          <rect x="22" y="32" width="58" height="34" rx="14" fill="url(#rocketBody)" />
          <rect x="22" y="32" width="58" height="34" rx="14" fill="none" stroke="#5c0b0b" strokeWidth="2.2" strokeOpacity="0.6" />
          {/* white band + window */}
          <path d="M44 32 H56 V66 H44 Z" fill="#fff" opacity="0.92" />
          <circle cx="36" cy="49" r="7" fill="#0b2866" />
          <circle cx="36" cy="48" r="5.5" fill="#93d2ff" />
          <circle cx="34.5" cy="46.5" r="2" fill="#fff" />
          {/* nose */}
          <path d="M78 37 Q98 46 98 54 Q98 62 78 71 Z" fill="#874b00" />
          <path d="M78 32 Q98 41 98 49 Q98 57 78 66 Z" fill="url(#rocketNose)" stroke="#874b00" strokeWidth="2.2" strokeOpacity="0.6" strokeLinejoin="round" />
          <ellipse cx="48" cy="37" rx="22" ry="3" fill="#fff" opacity="0.45" />
        </g>
      </g>
    </svg>
  );
}

function Bomb() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="bomb-wobble">
      <Shadow rx={34} cy={94} />
      <circle cx="50" cy="62" r="34" fill="#070a2e" />
      <circle cx="50" cy="57" r="34" fill="url(#bombBody)" />
      <circle cx="50" cy="57" r="34" fill="none" stroke="#070a2e" strokeWidth="2.5" strokeOpacity="0.7" />
      <path d="M16 57 A34 34 0 0 0 84 57" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.18" />
      <ellipse cx="36" cy="40" rx="12" ry="7" fill="#fff" opacity="0.75" transform="rotate(-35 36 40)" />
      <rect x="39" y="18" width="22" height="12" rx="4" fill="#7c86b0" stroke="#2a2f5c" strokeWidth="2.5" />
      <rect x="42" y="20" width="16" height="3" rx="1.5" fill="#fff" opacity="0.5" />
      <path d="M50 18 C52 8 62 6 70 10" stroke="#a87040" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <g className="fuse-spark" style={{ transformOrigin: "72px 9px" }}>
        <path d="M72 0 L75 6 L82 6 L76.5 10.5 L78.5 18 L72 13.5 L65.5 18 L67.5 10.5 L62 6 L69 6 Z" fill="#ffd43b" />
        <circle cx="72" cy="9" r="3" fill="#fff" />
      </g>
    </svg>
  );
}

function Plane() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="plane-flutter">
      <g transform="rotate(-12 50 50)">
        <path d="M8 52 L92 18 L64 86 L48 62 Z" transform="translate(0 7)" fill="#0f3f80" opacity="0.4" />
        <path d="M8 52 L92 18 L48 62 Z" fill="url(#planeTop)" stroke="#1d5fae" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M48 62 L92 18 L64 86 Z" fill="#8fc8ff" stroke="#1d5fae" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M48 62 L52 80 L64 86" fill="#5aa6ee" stroke="#1d5fae" strokeWidth="3" strokeLinejoin="round" />
        <path d="M20 50 L80 26" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      </g>
    </svg>
  );
}

const BALL_COLORS = ["#f03a3a", "#ffc62a", "#2f80f2", "#41bd3e", "#a354ea", "#ff8a1f"];

/** A spinning beach ball: clears every piece of one colour. */
function Ball() {
  const wedge = (i: number) => {
    const a0 = (i * Math.PI) / 3 - Math.PI / 2;
    const a1 = a0 + Math.PI / 3;
    const p = (a: number) => `${f(50 + Math.cos(a) * 44)} ${f(48 + Math.sin(a) * 44)}`;
    return `M50 48 L${p(a0)} A44 44 0 0 1 ${p(a1)} Z`;
  };
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <Shadow rx={34} />
      <circle cx="50" cy="53" r="40" fill="#1a0b4a" opacity="0.8" />
      <g clipPath="url(#ballClip)">
        <g className="ball-spin">
          {BALL_COLORS.map((c, i) => (
            <path key={i} d={wedge(i)} fill={c} />
          ))}
        </g>
        <circle cx="50" cy="48" r="40" fill="url(#ballShade)" />
      </g>
      <circle cx="50" cy="48" r="40" fill="none" stroke="#1a0b4a" strokeWidth="2.5" strokeOpacity="0.55" />
      <ellipse cx="35" cy="30" rx="12" ry="7" fill="#fff" opacity="0.85" transform="rotate(-35 35 30)" />
    </svg>
  );
}

export function SpecialArt({ kind }: { kind: SpecialKind }) {
  switch (kind) {
    case "rocketH":
      return <Rocket vertical={false} />;
    case "rocketV":
      return <Rocket vertical />;
    case "bomb":
      return <Bomb />;
    case "plane":
      return <Plane />;
    case "rainbow":
      return <Ball />;
  }
}

export const PieceArt = memo(function PieceArt({ tile }: { tile: Pick<Tile, "color" | "special"> }) {
  if (tile.special) {
    return (
      <div className="relative h-full w-full">
        <div className="special-glow absolute inset-[-8%] rounded-full" />
        <div className="relative h-full w-full">
          <SpecialArt kind={tile.special} />
        </div>
      </div>
    );
  }
  return <Gem color={tile.color} className="h-full w-full" />;
});

/* ------------------------------------------------------------------ */
/* Obstacles                                                           */
/* ------------------------------------------------------------------ */

const STAMP = "M50 24 L57 41 L75 43 L62 55 L66 73 L50 64 L34 73 L38 55 L25 43 L43 41 Z";

/** Wooden planks nailed over a cell. */
export function CrateArt({ hp }: { hp: number }) {
  const heavy = hp >= 3;
  const wood = heavy ? "url(#woodDark)" : "url(#woodLight)";
  const edge = heavy ? "#5a2f12" : "#8d5527";
  const seam = heavy ? "#4a2510" : "#a4632d";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full">
      <rect x="4" y="9" width="92" height="88" rx="12" fill={edge} />
      <rect x="4" y="3" width="92" height="88" rx="12" fill={wood} />
      {/* two planks with a seam */}
      <path d="M50 3 V91" stroke={seam} strokeWidth="3" />
      <path d="M50 3 V91" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.25" transform="translate(2 0)" />
      <g stroke={seam} strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M14 18 Q26 22 36 18 M12 42 Q22 46 38 44 M14 70 Q24 66 36 70" />
        <path d="M62 14 Q74 18 86 14 M60 38 Q72 42 88 40 M62 66 Q74 62 86 66" />
      </g>
      <rect x="4" y="3" width="92" height="88" rx="12" fill="none" stroke={edge} strokeWidth="3" />
      <rect x="9" y="7" width="82" height="20" rx="8" fill="#fff" opacity="0.22" />
      {/* embossed stamp */}
      <path d={STAMP} fill="#fff" opacity="0.35" transform="translate(0 2)" />
      <path d={STAMP} fill={edge} opacity="0.7" transform="translate(0 -1.5)" />
      <path d={STAMP} fill={edge} opacity="0.45" />
      {hp >= 2 && (
        <g fill="#c3cbe0" stroke="#4a5272" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M4 21 Q4 3 22 3 L22 14 Q15 14 15 21 Z" />
          <path d="M96 21 Q96 3 78 3 L78 14 Q85 14 85 21 Z" />
          <path d="M4 73 Q4 91 22 91 L22 80 Q15 80 15 73 Z" />
          <path d="M96 73 Q96 91 78 91 L78 80 Q85 80 85 73 Z" />
        </g>
      )}
      {heavy && (
        <g fill="#e6ebf7" stroke="#4a5272" strokeWidth="1.8">
          <circle cx="28" cy="30" r="3.5" />
          <circle cx="72" cy="30" r="3.5" />
          <circle cx="28" cy="66" r="3.5" />
          <circle cx="72" cy="66" r="3.5" />
        </g>
      )}
    </svg>
  );
}

export function CloudArt({ hp }: { hp: number }) {
  const fill = hp >= 2 ? "url(#cloud2)" : "url(#cloud1)";
  const stroke = hp >= 2 ? "#c43c84" : "#e489b8";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full">
      <g transform="translate(0 6)" fill="#a33a73" opacity="0.35">
        <circle cx="30" cy="58" r="24" />
        <circle cx="70" cy="58" r="24" />
        <circle cx="50" cy="38" r="26" />
      </g>
      <g fill={fill} stroke={stroke} strokeWidth="3.5">
        <circle cx="28" cy="58" r="23" />
        <circle cx="72" cy="58" r="23" />
        <circle cx="50" cy="36" r="25" />
        <circle cx="50" cy="64" r="25" />
      </g>
      <g fill={fill}>
        <circle cx="28" cy="58" r="20" />
        <circle cx="72" cy="58" r="20" />
        <circle cx="50" cy="36" r="22" />
        <circle cx="50" cy="64" r="22" />
      </g>
      <ellipse cx="40" cy="28" rx="10" ry="5.5" fill="#fff" opacity="0.9" transform="rotate(-25 40 28)" />
      {hp >= 2 && <path d="M38 60 Q50 48 62 60 Q50 72 44 62" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.85" />}
    </svg>
  );
}

export function BlockerArt({ kind, hp }: { kind: BlockerKind; hp: number }) {
  return kind === "crate" ? <CrateArt hp={hp} /> : <CloudArt hp={hp} />;
}

/** Frosted glass over a piece; cracks appear after the first hit. */
export function IceArt({ hp }: { hp: number }) {
  return (
    <div
      className="absolute inset-[1px] rounded-[24%]"
      style={{
        background:
          hp >= 2
            ? "linear-gradient(135deg, rgb(240 251 255 / 0.98), rgb(120 196 255 / 0.95))"
            : "linear-gradient(135deg, rgb(235 250 255 / 0.9), rgb(150 212 255 / 0.75))",
        boxShadow: `inset 0 0 0 ${hp >= 2 ? 3 : 2}px #fff, inset 0 -6px 10px rgb(40 120 220 / 0.35), 0 2px 0 rgb(40 110 200 / 0.45)`,
      }}
    >
      <div className="absolute left-[12%] top-[9%] h-[16%] w-[44%] -rotate-12 rounded-full bg-white/85" />
      {hp >= 2 ? (
        <div className="absolute bottom-[12%] right-[10%] h-[10%] w-[28%] -rotate-12 rounded-full bg-white/70" />
      ) : (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M22 18 L46 44 L40 62 L58 84 M46 44 L70 30 M40 62 L18 72" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 18 L46 44 L40 62 L58 84 M46 44 L70 30 M40 62 L18 72" fill="none" stroke="#3b8fe0" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" transform="translate(1 1)" />
        </svg>
      )}
    </div>
  );
}

/** Chains wrapped around a stuck piece. */
export function LockArt() {
  const link = (x: number, y: number, rot: number) => (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x="-9" y="-5.5" width="18" height="11" rx="5.5" fill="none" stroke="#4b5372" strokeWidth="6.5" />
      <rect x="-9" y="-5.5" width="18" height="11" rx="5.5" fill="none" stroke="url(#chainFill)" strokeWidth="4" />
    </g>
  );
  const diag = (flip: boolean) =>
    [0, 1, 2, 3, 4].map((i) => {
      const t = i / 4;
      const x = 12 + t * 76;
      const y = flip ? 88 - t * 76 : 12 + t * 76;
      return <g key={`${flip}${i}`}>{link(x, y, flip ? -45 + (i % 2) * 90 : 45 + (i % 2) * 90)}</g>;
    });
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full">
      {diag(false)}
      {diag(true)}
      <g transform="translate(50 56)">
        <path d="M-9 -8 V-14 A9 9 0 0 1 9 -14 V-8" fill="none" stroke="#4b5372" strokeWidth="5" />
        <rect x="-13" y="-9" width="26" height="22" rx="5" fill="#ffc93c" stroke="#8a5a00" strokeWidth="3" />
        <circle cx="0" cy="1" r="3" fill="#8a5a00" />
      </g>
    </svg>
  );
}

const CLOVER = "M0 -3 C-7 -14 -17 -6 -8 1 C-17 8 -7 16 0 5 C7 16 17 8 8 1 C17 -6 7 -14 0 -3 Z";

/** Clover carpet that sits under a piece. */
export function GrassArt() {
  const spots: [number, number, number][] = [
    [26, 27, 1.5],
    [68, 24, 1.3],
    [76, 66, 1.45],
    [36, 68, 1.6],
    [54, 46, 1.1],
  ];
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full" preserveAspectRatio="none">
      <rect x="0" y="0" width="100" height="100" rx="20" fill="url(#grassFill)" />
      <rect x="4" y="4" width="92" height="30" rx="14" fill="#fff" opacity="0.18" />
      {spots.map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d={CLOVER} fill="#176b1c" opacity="0.7" transform="translate(0 2)" />
          <path d={CLOVER} fill="#2f9d2e" />
          <path d={CLOVER} fill="#6fd65c" opacity="0.9" transform="translate(0 -1) scale(0.72)" />
        </g>
      ))}
      <rect x="0" y="0" width="100" height="100" rx="20" fill="none" stroke="#1f7f24" strokeWidth="3" strokeOpacity="0.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

/** Chunky mallet for the hammer booster. */
export function HammerArt() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full">
      <ellipse cx="52" cy="88" rx="26" ry="6" fill="#000" opacity="0.25" />
      <g transform="rotate(-42 50 50)">
        <rect x="45" y="36" width="12" height="54" rx="6" fill="#5a2f12" transform="translate(0 3)" />
        <rect x="45" y="36" width="12" height="54" rx="6" fill="url(#woodDark)" />
        <rect x="47" y="40" width="3" height="40" rx="1.5" fill="#fff" opacity="0.35" />
        <rect x="22" y="12" width="58" height="28" rx="9" fill="#7a3a00" transform="translate(0 4)" />
        <rect x="22" y="12" width="58" height="28" rx="9" fill="url(#hammerHead)" />
        <rect x="22" y="12" width="58" height="28" rx="9" fill="none" stroke="#7a3a00" strokeWidth="2.2" strokeOpacity="0.6" />
        <rect x="27" y="15" width="48" height="8" rx="4" fill="#fff" opacity="0.45" />
        <rect x="44" y="12" width="14" height="28" fill="#fff" opacity="0.18" />
      </g>
    </svg>
  );
}

/** Two crossing arrows for the shuffle booster. */
export function ShuffleArt() {
  const arrows = "M14 32 H30 L62 68 H78 M14 68 H30 L62 32 H78";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={arrows} stroke="#0b3a7a" strokeWidth="15" transform="translate(0 3)" opacity="0.5" />
        <path d={arrows} stroke="#0b3a7a" strokeWidth="15" />
        <path d={arrows} stroke="#fff" strokeWidth="8" />
      </g>
      <g strokeLinejoin="round">
        <path d="M74 20 L94 32 L74 44 Z" fill="#fff" stroke="#0b3a7a" strokeWidth="4" />
        <path d="M74 56 L94 68 L74 80 Z" fill="#fff" stroke="#0b3a7a" strokeWidth="4" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

export function GoalIcon({
  kind,
  color,
  special,
  className = "h-9 w-9",
}: {
  kind: GoalKind;
  color?: number;
  special?: SpecialKind;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {kind === "color" && <Gem color={color ?? 0} className="h-full w-full" />}
      {kind === "crate" && <CrateArt hp={1} />}
      {kind === "cloud" && <CloudArt hp={1} />}
      {kind === "ice" && <IceArt hp={2} />}
      {kind === "grass" && <GrassArt />}
      {kind === "special" && <SpecialArt kind={special ?? "bomb"} />}
      {kind === "lock" && (
        <div className="relative h-full w-full">
          <div className="absolute inset-[14%] opacity-90">
            <Gem color={1} className="h-full w-full" />
          </div>
          <div className="absolute inset-0">
            <LockArt />
          </div>
        </div>
      )}
    </div>
  );
}

export function Coin({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="54" r="42" fill="#b86a0a" />
      <circle cx="50" cy="48" r="42" fill="url(#coinFace)" stroke="#b86a0a" strokeWidth="5" />
      <circle cx="50" cy="48" r="28" fill="none" stroke="#e08a00" strokeWidth="4" />
      <path
        d="M50 30 L56 44 L70 46 L59 55 L62 69 L50 61 L38 69 L41 55 L30 46 L44 44 Z"
        fill="#fff6c9"
        stroke="#e08a00"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="34" cy="28" rx="10" ry="5" fill="#fff" opacity="0.6" transform="rotate(-30 34 28)" />
    </svg>
  );
}

export function StarShape({ filled, className = "h-6 w-6" }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path
        d="M50 6 L62 36 L94 38 L69 58 L77 90 L50 72 L23 90 L31 58 L6 38 L38 36 Z"
        fill={filled ? "#ffd23f" : "#5b4a86"}
        stroke={filled ? "#d97706" : "#3b2a63"}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {filled && <ellipse cx="40" cy="36" rx="9" ry="5" fill="#fff" opacity="0.7" transform="rotate(-30 40 36)" />}
    </svg>
  );
}
