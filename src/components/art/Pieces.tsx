import { memo, type ReactNode } from "react";
import type { BlockerKind, GoalKind, SpecialKind, Tile } from "@/lib/game/types";

/** Tones per piece color: bevel, face, side wall and the raised symbol. */
export const GEM_COLORS = [
  { name: "Roșu", base: "#ff3d4f", light: "#ff9aa5", dark: "#c8102c", depth: "#7d0618", sym: "#ffe3e6", rim: "#ffc4ca" },
  { name: "Albastru", base: "#2196ff", light: "#8fd0ff", dark: "#0f5fd1", depth: "#082f7a", sym: "#e2f3ff", rim: "#bfe5ff" },
  { name: "Galben", base: "#ffc70f", light: "#ffeb7a", dark: "#ea8a00", depth: "#8f4f00", sym: "#fffbe2", rim: "#fff3b0" },
  { name: "Verde", base: "#3ccf45", light: "#a6f08c", dark: "#178f2a", depth: "#0a5216", sym: "#ebffe2", rim: "#c9f7b4" },
  { name: "Mov", base: "#b052ff", light: "#dba8ff", dark: "#6f22d6", depth: "#3d0c85", sym: "#f6ebff", rim: "#e6c9ff" },
  { name: "Alb", base: "#eef1fb", light: "#ffffff", dark: "#aab4d6", depth: "#5f6a93", sym: "#ffffff", rim: "#ffffff" },
];

const SHAPES = [
  // rounded square
  "M50 6 C83 6 94 17 94 50 C94 83 83 94 50 94 C17 94 6 83 6 50 C6 17 17 6 50 6 Z",
  // rounded triangle, point down
  "M19 11 H81 Q98 11 90 27 L61 85 Q50 102 39 85 L10 27 Q2 11 19 11 Z",
  // rounded hexagon
  "M31 8 H69 Q77 8 81 15 L94 42 Q97 50 94 58 L81 85 Q77 92 69 92 H31 Q23 92 19 85 L6 58 Q3 50 6 42 L19 15 Q23 8 31 8 Z",
  // rounded diamond
  "M50 4 Q57 4 63 10 L90 37 Q96 43 96 50 Q96 57 90 63 L63 90 Q57 96 50 96 Q43 96 37 90 L10 63 Q4 57 4 50 Q4 43 10 37 L37 10 Q43 4 50 4 Z",
  // circle
  "M50 6 A44 44 0 1 1 49.9 6 Z",
  // rounded octagon
  "M33 6 H67 Q73 6 77 10 L90 23 Q94 27 94 33 V67 Q94 73 90 77 L77 90 Q73 94 67 94 H33 Q27 94 23 90 L10 77 Q6 73 6 67 V33 Q6 27 10 23 L23 10 Q27 6 33 6 Z",
];

/** Where the symbol sits: the triangle's visual centre is higher than the box centre. */
const SYMBOL_SHIFT = [0, -7, 0, 0, 0, 0];

function SymbolPath({ color, fill }: { color: number; fill: string }) {
  switch (color) {
    case 0:
      return <path d="M50 72 C33 62 26 52 28 43 C30 34 42 31 50 41 C58 31 70 34 72 43 C74 52 67 62 50 72 Z" fill={fill} />;
    case 1:
      return <path d="M50 28 C58 38 65 46 65 53 C65 61 58 67 50 67 C42 67 35 61 35 53 C35 46 42 38 50 28 Z" fill={fill} />;
    case 2:
      return (
        <g fill={fill} stroke={fill} strokeLinecap="round">
          <circle cx="50" cy="50" r="11.5" stroke="none" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line key={i} x1={50 + Math.cos(a) * 17.5} y1={50 + Math.sin(a) * 17.5} x2={50 + Math.cos(a) * 24} y2={50 + Math.sin(a) * 24} strokeWidth="5.5" />
            );
          })}
        </g>
      );
    case 3:
      return <path d="M32 67 C31 47 44 34 68 33 C68 56 55 68 32 67 Z" fill={fill} />;
    case 4:
      return <path d="M56 28 A23 23 0 1 0 73 62 A19 19 0 0 1 56 28 Z" fill={fill} />;
    default:
      return (
        <path
          d="M50 27 L56.5 43 L73 44 L60 54.5 L64.5 71 L50 61.5 L35.5 71 L40 54.5 L27 44 L43.5 43 Z"
          fill={fill}
          strokeLinejoin="round"
          stroke={fill}
          strokeWidth="3"
        />
      );
  }
}

/** Shared gradients and clip paths, rendered once per screen. */
export function GemDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        {GEM_COLORS.map((g, i) => (
          <linearGradient key={`v${i}`} id={`bevel${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={g.rim} />
            <stop offset="0.45" stopColor={g.base} />
            <stop offset="1" stopColor={g.dark} />
          </linearGradient>
        ))}
        {GEM_COLORS.map((g, i) => (
          <linearGradient key={`f${i}`} id={`face${i}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor={g.light} />
            <stop offset="0.5" stopColor={g.base} />
            <stop offset="1" stopColor={g.dark} />
          </linearGradient>
        ))}
        {GEM_COLORS.map((g, i) => (
          <linearGradient key={`s${i}`} id={`sym${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor={g.sym} />
          </linearGradient>
        ))}
        {SHAPES.map((d, i) => (
          <clipPath key={`c${i}`} id={`face-clip${i}`}>
            <path d={d} transform="translate(9 9) scale(0.82)" />
          </clipPath>
        ))}
        <clipPath id="topHalf">
          <rect x="0" y="0" width="100" height="46" />
        </clipPath>
        <radialGradient id="faceDome" cx="0.42" cy="0.32" r="0.62">
          <stop offset="0" stopColor="#fff" stopOpacity="0.42" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </radialGradient>
        <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rocketBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb0a8" />
          <stop offset="0.45" stopColor="#ff4040" />
          <stop offset="1" stopColor="#b3101b" />
        </linearGradient>
        <linearGradient id="rocketNose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c0" />
          <stop offset="1" stopColor="#ffae00" />
        </linearGradient>
        <radialGradient id="bombBody" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#9fb0ff" />
          <stop offset="0.35" stopColor="#3e4cb3" />
          <stop offset="1" stopColor="#121649" />
        </radialGradient>
        <linearGradient id="planeTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cfe8ff" />
        </linearGradient>
        <radialGradient id="globeShade" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#1a0b4a" stopOpacity="0.55" />
        </radialGradient>
        <clipPath id="globeClip">
          <circle cx="50" cy="50" r="40" />
        </clipPath>
        <linearGradient id="crate1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7c98c" />
          <stop offset="1" stopColor="#d08a45" />
        </linearGradient>
        <linearGradient id="crate3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c27c3e" />
          <stop offset="1" stopColor="#7d4520" />
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
        <linearGradient id="grassFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8be26a" />
          <stop offset="1" stopColor="#3faa3b" />
        </linearGradient>
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

/**
 * A chunky 3D candy block: soft shadow, side wall, bevelled rim lit from above,
 * a domed face and a raised symbol with its own shadow and shine.
 */
export const Gem = memo(function Gem({ color, className }: { color: number; className?: string }) {
  const c = GEM_COLORS[color] ?? GEM_COLORS[0];
  const d = SHAPES[color] ?? SHAPES[0];
  const dy = SYMBOL_SHIFT[color] ?? 0;
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden>
      <path d={d} transform="translate(2 11)" fill="#0b1440" opacity="0.22" />
      <path d={d} transform="translate(0 7)" fill={c.depth} />
      <path d={d} fill={`url(#bevel${color})`} />
      <path d={d} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.6" clipPath="url(#topHalf)" />
      <path d={d} transform="translate(9 9) scale(0.82)" fill={`url(#face${color})`} />
      <path d={d} transform="translate(9 9) scale(0.82)" fill="url(#faceDome)" />
      <path d={d} transform="translate(9 9) scale(0.82)" fill="none" stroke={c.dark} strokeOpacity="0.35" strokeWidth="2.4" />
      <g transform={`translate(0 ${dy})`}>
        <g transform="translate(0 3.2)" opacity="0.5">
          <SymbolPath color={color} fill={c.depth} />
        </g>
        <SymbolPath color={color} fill={`url(#sym${color})`} />
      </g>
      <g clipPath={`url(#face-clip${color})`}>
        <ellipse cx="44" cy="20" rx="34" ry="14" fill="url(#gloss)" opacity="0.75" />
      </g>
      <path d="M74 22 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#fff" opacity="0.9" />
    </svg>
  );
});

function Rocket({ vertical }: { vertical: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <g transform={vertical ? "rotate(90 50 50)" : undefined}>
        <g className="rocket-shimmer">
          <path d="M18 36 L4 51 L18 66 Z" fill="url(#rocketNose)" stroke="#a35f00" strokeWidth="3" strokeLinejoin="round" />
          <path d="M82 36 L96 51 L82 66 Z" fill="url(#rocketNose)" stroke="#a35f00" strokeWidth="3" strokeLinejoin="round" />
          <rect x="15" y="38" width="70" height="32" rx="16" fill="#7d0a12" opacity="0.6" />
          <rect x="15" y="33" width="70" height="34" rx="17" fill="url(#rocketBody)" stroke="#7d0a12" strokeWidth="3.5" />
          <rect x="33" y="34" width="8" height="32" fill="#fff" opacity="0.92" />
          <rect x="59" y="34" width="8" height="32" fill="#fff" opacity="0.92" />
          <rect x="22" y="38" width="56" height="8" rx="4" fill="#fff" opacity="0.5" />
          <circle cx="50" cy="50" r="7.5" fill="#ffe066" stroke="#a35f00" strokeWidth="2.5" />
          <circle cx="48" cy="48" r="2.5" fill="#fff" />
        </g>
      </g>
    </svg>
  );
}

function Bomb() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="bomb-wobble">
      <circle cx="50" cy="61" r="32" fill="#070a2e" opacity="0.5" />
      <circle cx="50" cy="56" r="32" fill="url(#bombBody)" stroke="#0b0f33" strokeWidth="3.5" />
      <rect x="40" y="18" width="20" height="11" rx="4" fill="#a6b0d4" stroke="#3b4470" strokeWidth="3" />
      <path d="M50 18 C52 9 61 7 68 11" stroke="#7a5230" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g className="fuse-spark" style={{ transformOrigin: "70px 10px" }}>
        <path d="M70 1 L73 7 L79 7 L74 11 L76 18 L70 14 L64 18 L66 11 L61 7 L67 7 Z" fill="#ffd43b" />
        <circle cx="70" cy="10" r="3" fill="#fff" />
      </g>
      <ellipse cx="37" cy="43" rx="10" ry="6.5" fill="#fff" opacity="0.6" transform="rotate(-35 37 43)" />
      <circle cx="62" cy="70" r="3" fill="#fff" opacity="0.35" />
    </svg>
  );
}

function Plane() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="plane-flutter">
      <g transform="rotate(-12 50 50)">
        <path d="M8 52 L92 18 L64 86 L48 62 Z" transform="translate(0 6)" fill="#0f3f80" opacity="0.35" />
        <path d="M8 52 L92 18 L48 62 Z" fill="url(#planeTop)" stroke="#1d5fae" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M48 62 L92 18 L64 86 Z" fill="#8fc8ff" stroke="#1d5fae" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M48 62 L52 80 L64 86" fill="#5aa6ee" stroke="#1d5fae" strokeWidth="3" strokeLinejoin="round" />
        <path d="M20 50 L80 26" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      </g>
    </svg>
  );
}

const GLOBE_TILES = ["#ff4b5c", "#ffcf26", "#33a3ff", "#4ed351", "#b863ff", "#ff9f43"];

/** A spinning multicolor glass ball made of little tiles. */
function Globe() {
  const rows = 6;
  const cols = 12;
  const tiles: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push(
        <rect
          key={`${r}-${c}`}
          x={c * 13.4 + 1}
          y={12 + r * 13.4 + 1}
          width="11.4"
          height="11.4"
          rx="2.5"
          fill={GLOBE_TILES[(r * 2 + c) % GLOBE_TILES.length]}
        />,
      );
    }
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="55" r="40" fill="#1a0b4a" opacity="0.45" />
      <circle cx="50" cy="50" r="41.5" fill="#2a1466" />
      <g clipPath="url(#globeClip)">
        <g className="globe-spin">
          {tiles}
          <g transform="translate(160.8 0)">{tiles}</g>
        </g>
        <circle cx="50" cy="50" r="40" fill="url(#globeShade)" />
      </g>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="3" />
      <ellipse cx="36" cy="30" rx="12" ry="7" fill="#fff" opacity="0.85" transform="rotate(-30 36 30)" />
      <circle cx="66" cy="68" r="3" fill="#fff" opacity="0.8" />
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
      return <Globe />;
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

export function CrateArt({ hp }: { hp: number }) {
  const heavy = hp >= 3;
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full">
      <rect x="5" y="10" width="90" height="88" rx="15" fill="#5c3317" opacity="0.55" />
      <rect x="5" y="4" width="90" height="88" rx="15" fill={heavy ? "url(#crate3)" : "url(#crate1)"} stroke="#5c3317" strokeWidth="4" />
      <rect x="15" y="14" width="70" height="68" rx="7" fill="none" stroke="#5c3317" strokeOpacity="0.5" strokeWidth="3.5" />
      <path d="M18 78 L82 18" stroke="#5c3317" strokeOpacity="0.55" strokeWidth="8" strokeLinecap="round" />
      <path d="M18 78 L82 18" stroke={heavy ? "#cf8a4c" : "#ffe0b3"} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 36 H88 M12 58 H88" stroke="#5c3317" strokeOpacity="0.22" strokeWidth="2.5" />
      {hp >= 2 && (
        <g fill="#c3cbe0" stroke="#4a5272" strokeWidth="2.5">
          <path d="M5 22 Q5 4 23 4 L23 15 Q16 15 16 22 Z" />
          <path d="M95 22 Q95 4 77 4 L77 15 Q84 15 84 22 Z" />
          <path d="M5 74 Q5 92 23 92 L23 81 Q16 81 16 74 Z" />
          <path d="M95 74 Q95 92 77 92 L77 81 Q84 81 84 74 Z" />
        </g>
      )}
      {heavy && (
        <g fill="#e6ebf7" stroke="#4a5272" strokeWidth="1.8">
          <circle cx="29" cy="28" r="4" />
          <circle cx="71" cy="28" r="4" />
          <circle cx="29" cy="68" r="4" />
          <circle cx="71" cy="68" r="4" />
        </g>
      )}
      <ellipse cx="32" cy="14" rx="16" ry="4.5" fill="#fff" opacity="0.4" />
    </svg>
  );
}

export function CloudArt({ hp }: { hp: number }) {
  const fill = hp >= 2 ? "url(#cloud2)" : "url(#cloud1)";
  const stroke = hp >= 2 ? "#c43c84" : "#e489b8";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full">
      <g transform="translate(0 5)" fill="#a33a73" opacity="0.3">
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
      {hp >= 2 && <div className="absolute bottom-[12%] right-[10%] h-[10%] w-[28%] -rotate-12 rounded-full bg-white/70" />}
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

/** Grass carpet that sits under a piece. */
export function GrassArt() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full" preserveAspectRatio="none">
      <rect x="0" y="0" width="100" height="100" rx="20" fill="url(#grassFill)" />
      <g stroke="#b9f59a" strokeWidth="4" strokeLinecap="round" opacity="0.8">
        <path d="M18 30 l4 -10 M26 30 l-3 -9" />
        <path d="M66 22 l4 -10 M74 22 l-3 -9" />
        <path d="M40 74 l4 -10 M48 74 l-3 -9" />
        <path d="M80 82 l4 -10" />
        <path d="M14 84 l4 -10" />
      </g>
    </svg>
  );
}

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
