import { memo, type ReactNode } from "react";
import type { BlockerKind, GoalKind, SpecialKind, Tile } from "@/lib/game/types";

/**
 * Candy palette. `glow` is the light passing through the jelly, `depth` the darkest core
 * (also used for outlines of score popups), `base/light/dark` drive the particles.
 */
export const GEM_COLORS = [
  { name: "Inimioară", base: "#f2203f", light: "#ff9fae", dark: "#9c0720", depth: "#5e0412", glow: "#ff6f86", rim: "#ffc2cc" },
  { name: "Spirală", base: "#2e86ff", light: "#a9d4ff", dark: "#0b44a3", depth: "#05265e", glow: "#78b6ff", rim: "#cfe6ff" },
  { name: "Steluță", base: "#ffc107", light: "#fff3a6", dark: "#d57800", depth: "#7a4100", glow: "#ffe36b", rim: "#fff7cf" },
  { name: "Cub", base: "#35c23c", light: "#bdf5a0", dark: "#147523", depth: "#0a4214", glow: "#8be774", rim: "#dcffd0" },
  { name: "Bob", base: "#a23ae6", light: "#e5b8ff", dark: "#56128f", depth: "#310955", glow: "#cb83ff", rim: "#f0dcff" },
  { name: "Picătură", base: "#ff8418", light: "#ffd3a1", dark: "#c14700", depth: "#6e2700", glow: "#ffb066", rim: "#ffe6cc" },
];

const HEART =
  "M50 87 C23 70 9 55 11 37 C13 21 27 12 39 14 C45 15 49 19 50 24 C51 19 55 15 61 14 C73 12 87 21 89 37 C91 55 77 70 50 87 Z";
const STAR = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 19 : 40;
    pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(52 + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(" ");
})();
const DROP = "M13 79 C13 43 29 14 50 14 C71 14 87 43 87 79 Q87 87 79 87 H21 Q13 87 13 79 Z";

/** Curved white stripes of the swirl candy. */
const SWIRL = Array.from({ length: 6 }, (_, k) => {
  const a = (k * Math.PI) / 3;
  const R = 39;
  const p = (ang: number, r: number) => `${(50 + Math.cos(ang) * r).toFixed(1)} ${(49 + Math.sin(ang) * r).toFixed(1)}`;
  return `M50 49 Q${p(a + 0.75, 26)} ${p(a, R)} A${R} ${R} 0 0 1 ${p(a + 0.42, R)} Q${p(a + 1.05, 22)} 50 49 Z`;
});

/** Shared gradients, patterns and clip paths, rendered once per screen. */
export function GemDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        {GEM_COLORS.map((g, i) => (
          <radialGradient key={`b${i}`} id={`cBody${i}`} cx="0.36" cy="0.3" r="0.78">
            <stop offset="0" stopColor={g.light} />
            <stop offset="0.42" stopColor={g.base} />
            <stop offset="0.85" stopColor={g.dark} />
            <stop offset="1" stopColor={g.depth} />
          </radialGradient>
        ))}
        {GEM_COLORS.map((g, i) => (
          <radialGradient key={`g${i}`} id={`cGlow${i}`} cx="0.62" cy="0.78" r="0.45">
            <stop offset="0" stopColor={g.glow} stopOpacity="0.95" />
            <stop offset="1" stopColor={g.glow} stopOpacity="0" />
          </radialGradient>
        ))}
        <radialGradient id="cShadow">
          <stop offset="0" stopColor="#0d1a4a" stopOpacity="0.42" />
          <stop offset="1" stopColor="#0d1a4a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cSpec" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id="cSphere" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.38" />
        </radialGradient>
        <pattern id="cSugar" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.8" r="0.9" fill="#fff" opacity="0.9" />
          <circle cx="5.2" cy="4.6" r="0.7" fill="#fff" opacity="0.75" />
          <rect x="3.6" y="0.8" width="1.1" height="1.1" fill="#fff" opacity="0.6" transform="rotate(30 4 1.3)" />
        </pattern>
        <pattern id="cSpeckle" width="11" height="9" patternUnits="userSpaceOnUse">
          <ellipse cx="2.5" cy="2.5" rx="1.4" ry="1" fill="#3a0a66" opacity="0.55" />
          <ellipse cx="8" cy="6.5" rx="1.1" ry="0.8" fill="#3a0a66" opacity="0.45" />
        </pattern>
        <clipPath id="clipSwirl">
          <circle cx="50" cy="49" r="39" />
        </clipPath>
        <clipPath id="clipCube">
          <rect x="14" y="14" width="72" height="72" rx="18" />
        </clipPath>
        <clipPath id="clipDrop">
          <path d={DROP} />
        </clipPath>
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

/** Soft contact shadow under every candy. */
const Shadow = ({ rx = 31 }: { rx?: number }) => <ellipse cx="51" cy="92" rx={rx} ry="6.5" fill="url(#cShadow)" />;

/** Hard white glint plus a softer secondary reflection: the "wet" look of candy. */
const Glints = ({ x, y, rot = -32, w = 11, h = 6 }: { x: number; y: number; rot?: number; w?: number; h?: number }) => (
  <>
    <ellipse cx={x} cy={y} rx={w} ry={h} fill="url(#cSpec)" transform={`rotate(${rot} ${x} ${y})`} />
    <circle cx={x + w * 0.95} cy={y - h * 0.6} r="2.2" fill="#fff" opacity="0.95" />
  </>
);

function Candy({ color }: { color: number }) {
  const c = GEM_COLORS[color] ?? GEM_COLORS[0];
  switch (color) {
    case 0: // translucent jelly heart
      return (
        <>
          <Shadow rx={30} />
          <path d={HEART} fill={`url(#cBody0)`} />
          <path d={HEART} fill={`url(#cGlow0)`} />
          <path d="M22 58 C30 70 40 77 50 83 C60 77 70 70 78 58" fill="none" stroke={c.rim} strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
          <path d={HEART} fill="none" stroke={c.depth} strokeOpacity="0.35" strokeWidth="1.6" />
          <path d="M20 34 C21 25 29 20 36 21 C33 25 28 30 25 39 Z" fill="#fff" opacity="0.35" />
          <Glints x={31} y={31} />
          <circle cx="68" cy="27" r="3.2" fill="#fff" opacity="0.8" />
        </>
      );
    case 1: // hard swirl candy
      return (
        <>
          <Shadow rx={31} />
          <circle cx="50" cy="49" r="39" fill={`url(#cBody1)`} />
          <g clipPath="url(#clipSwirl)">
            {SWIRL.map((d, i) => (
              <path key={i} d={d} fill="#f2f8ff" opacity="0.92" />
            ))}
            <circle cx="50" cy="49" r="39" fill="url(#cSphere)" />
            <circle cx="50" cy="49" r="39" fill={`url(#cGlow1)`} opacity="0.55" />
          </g>
          <circle cx="50" cy="49" r="38.2" fill="none" stroke={c.rim} strokeOpacity="0.5" strokeWidth="1.6" />
          <circle cx="50" cy="49" r="39" fill="none" stroke={c.depth} strokeOpacity="0.4" strokeWidth="1.4" />
          <Glints x={34} y={28} w={13} h={6.5} />
        </>
      );
    case 2: // jelly star
      return (
        <>
          <Shadow rx={30} />
          <polygon points={STAR} fill={`url(#cBody2)`} stroke={`url(#cBody2)`} strokeWidth="9" strokeLinejoin="round" />
          <polygon points={STAR} fill={`url(#cGlow2)`} stroke={`url(#cGlow2)`} strokeWidth="9" strokeLinejoin="round" />
          <polygon points={STAR} fill="none" stroke={c.rim} strokeOpacity="0.45" strokeWidth="1.6" strokeLinejoin="round" transform="translate(50 52) scale(0.82) translate(-50 -52)" />
          <path d="M44 22 L48 15 L50 24 Z M27 41 L35 39 L33 45 Z" fill="#fff" opacity="0.55" />
          <Glints x={42} y={33} w={9} h={5} />
        </>
      );
    case 3: // sugared jelly cube
      return (
        <>
          <Shadow rx={33} />
          <rect x="14" y="14" width="72" height="72" rx="18" fill={`url(#cBody3)`} />
          <g clipPath="url(#clipCube)">
            <rect x="14" y="14" width="72" height="72" fill={`url(#cGlow3)`} />
            <path d="M14 14 H86 V30 Q50 24 14 30 Z" fill="#fff" opacity="0.18" />
            <rect x="14" y="14" width="72" height="72" fill="url(#cSugar)" opacity="0.85" />
          </g>
          <rect x="14.8" y="14.8" width="70.4" height="70.4" rx="17.4" fill="none" stroke={c.rim} strokeOpacity="0.55" strokeWidth="1.6" />
          <rect x="14" y="14" width="72" height="72" rx="18" fill="none" stroke={c.depth} strokeOpacity="0.35" strokeWidth="1.4" />
          <Glints x={32} y={27} w={12} h={5.5} rot={-18} />
        </>
      );
    case 4: // speckled jelly bean
      return (
        <>
          <Shadow rx={33} />
          <g transform="rotate(-24 50 50)">
            <rect x="8" y="24" width="84" height="52" rx="26" fill={`url(#cBody4)`} />
            <rect x="8" y="24" width="84" height="52" rx="26" fill={`url(#cGlow4)`} />
            <rect x="8" y="24" width="84" height="52" rx="26" fill="url(#cSpeckle)" />
            <rect x="8.8" y="24.8" width="82.4" height="50.4" rx="25.2" fill="none" stroke={c.rim} strokeOpacity="0.5" strokeWidth="1.5" />
            <rect x="8" y="24" width="84" height="52" rx="26" fill="none" stroke={c.depth} strokeOpacity="0.35" strokeWidth="1.4" />
            <rect x="20" y="30" width="48" height="10" rx="5" fill="url(#cSpec)" opacity="0.9" />
            <circle cx="75" cy="34" r="2.6" fill="#fff" opacity="0.9" />
          </g>
        </>
      );
    default: // sugar-coated gumdrop
      return (
        <>
          <Shadow rx={34} />
          <path d={DROP} fill={`url(#cBody5)`} />
          <g clipPath="url(#clipDrop)">
            <path d={DROP} fill={`url(#cGlow5)`} />
            <rect x="10" y="10" width="80" height="80" fill="url(#cSugar)" opacity="0.9" />
            <path d="M13 79 Q50 70 87 79 V90 H13 Z" fill={c.depth} opacity="0.25" />
          </g>
          <path d={DROP} fill="none" stroke={c.depth} strokeOpacity="0.35" strokeWidth="1.4" />
          <Glints x={35} y={32} w={10} h={6} rot={-40} />
        </>
      );
  }
}

/** A realistic 3D candy, one shape per color. */
export const Gem = memo(function Gem({ color, className }: { color: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <Candy color={color} />
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
