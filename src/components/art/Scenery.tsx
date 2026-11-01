import { memo, useEffect, useRef, useState } from "react";
import type { WorldTheme } from "@/lib/worlds";

/** A round, painterly tree: layered canopy blobs with a lit top-left side. */
function Tree({ x, y, s, color, light }: { x: number; y: number; s: number; color: string; light: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-6" y="-10" width="12" height="40" rx="5" fill="#6b4324" />
      <g fill={color}>
        <circle cx="0" cy="-34" r="30" />
        <circle cx="-22" cy="-16" r="22" />
        <circle cx="22" cy="-16" r="22" />
        <circle cx="0" cy="-8" r="24" />
      </g>
      <g fill={light} opacity="0.55">
        <circle cx="-10" cy="-42" r="16" />
        <circle cx="-26" cy="-22" r="10" />
        <circle cx="14" cy="-30" r="9" />
      </g>
      <ellipse cx="4" cy="2" rx="26" ry="12" fill="#000" opacity="0.14" />
    </g>
  );
}

const FLOWERS = ["#ff5a63", "#ff8fb1", "#fff3c4", "#ffb347"];

/** Flowering bush used in the blurred foreground. */
function Bush({ x, y, s, color, flip }: { x: number; y: number; s: number; color: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <g fill={color}>
        <ellipse cx="0" cy="0" rx="120" ry="52" />
        <ellipse cx="-70" cy="-18" rx="70" ry="42" />
        <ellipse cx="60" cy="-22" rx="78" ry="46" />
        <ellipse cx="0" cy="-34" rx="60" ry="34" />
      </g>
      <g fill="#fff" opacity="0.14">
        <ellipse cx="-60" cy="-40" rx="40" ry="16" />
        <ellipse cx="40" cy="-48" rx="44" ry="16" />
      </g>
      {[
        [-90, -20],
        [-40, -44],
        [10, -58],
        [60, -46],
        [100, -14],
        [-10, -14],
        [40, -8],
        [-60, 6],
      ].map(([fx, fy], i) => (
        <g key={i} transform={`translate(${fx} ${fy})`}>
          <circle r="9" fill={FLOWERS[i % FLOWERS.length]} />
          <circle r="3.5" fill="#fff6c9" />
        </g>
      ))}
    </g>
  );
}

/** Mix a hex colour towards black (k < 0) or white (k > 0). */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** The painted backdrop as SVG: blurred distance, stone balustrade, flowering foreground. */
function Painting({ theme }: { theme: WorldTheme }) {
  const night = !!theme.night;
  const leaf = theme.hillNear;
  const leafLight = shade(theme.hillNear, 0.35);
  const leafDark = shade(theme.ground, -0.25);
  const stone = night ? "#9a97b8" : "#f1e2c8";
  const stoneDark = night ? "#5f5c82" : "#c8a983";
  return (
    <>
      <defs>
        <linearGradient id="scSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.skyTop} />
          <stop offset="0.62" stopColor={theme.skyBottom} />
          <stop offset="1" stopColor={shade(theme.skyBottom, 0.3)} />
        </linearGradient>
        <radialGradient id="scGlow">
          <stop offset="0" stopColor="#fff8d6" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#fff2b8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff2b8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="scStone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(stone, 0.4)} />
          <stop offset="1" stopColor={stone} />
        </linearGradient>
        <linearGradient id="scWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(theme.skyBottom, -0.05)} />
          <stop offset="1" stopColor={shade(theme.skyTop, 0.2)} />
        </linearGradient>
        <radialGradient id="scVignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#1a0f3a" stopOpacity="0" />
          <stop offset="1" stopColor="#1a0f3a" stopOpacity="0.32" />
        </radialGradient>
        <filter id="scFar" x="-5%" y="-10%" width="110%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="scNear" x="-5%" y="-10%" width="110%" height="120%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <rect width="1000" height="500" fill="url(#scSky)" />

      {night ? (
        <g>
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={(i * 193) % 1000} cy={20 + ((i * 71) % 190)} r={i % 3 ? 1.4 : 2.2} fill="#fff" opacity={0.5 + (i % 4) * 0.12} />
          ))}
          <g transform="translate(800 110)">
            <circle r="110" fill="url(#scGlow)" opacity="0.5" />
            <circle r="38" fill="#fff6d2" />
            <circle cx="14" cy="-8" r="34" fill={theme.skyTop} opacity="0.9" />
          </g>
        </g>
      ) : (
        <g transform="translate(790 120)">
          <circle r="190" fill="url(#scGlow)" />
          <circle r="46" fill="#fff6c2" />
        </g>
      )}

      {/* distance: soft hills, trees and rooftops out of focus */}
      <g filter="url(#scFar)">
        <path d="M0 300 Q120 250 260 280 T520 270 T780 262 T1000 280 V360 H0 Z" fill={theme.hillFar} opacity="0.85" />
        <g fill={shade(theme.hillFar, -0.18)} opacity="0.9">
          <circle cx="90" cy="262" r="34" />
          <circle cx="140" cy="248" r="40" />
          <circle cx="330" cy="256" r="30" />
          <circle cx="600" cy="250" r="36" />
          <circle cx="650" cy="262" r="28" />
          <circle cx="900" cy="252" r="38" />
          <circle cx="960" cy="266" r="30" />
        </g>
        <g fill={shade(theme.hillFar, 0.25)} opacity="0.8">
          <path d="M200 290 V240 L230 220 L260 240 V290 Z" />
          <rect x="420" y="236" width="70" height="60" rx="3" />
          <path d="M415 240 L455 212 L495 240 Z" />
          <rect x="760" y="244" width="52" height="50" rx="3" />
          <path d="M755 248 L786 226 L817 248 Z" />
        </g>
      </g>

      {/* lake and near hill */}
      <path d="M0 318 Q250 300 500 312 T1000 306 V370 H0 Z" fill="url(#scWater)" opacity="0.9" />
      <path d="M0 330 Q160 306 330 326 T660 322 T1000 318 V390 H0 Z" fill={leaf} />
      <Tree x={70} y={330} s={1.15} color={leaf} light={leafLight} />
      <Tree x={210} y={338} s={0.8} color={leaf} light={leafLight} />
      <Tree x={880} y={332} s={1.2} color={leaf} light={leafLight} />
      <Tree x={980} y={342} s={0.85} color={leaf} light={leafLight} />

      {/* stone balustrade */}
      <g>
        <rect x="-20" y="414" width="1040" height="30" fill={stoneDark} opacity="0.55" />
        {Array.from({ length: 19 }, (_, i) => {
          const x = 24 + i * 54;
          return (
            <g key={i} transform={`translate(${x} 0)`}>
              <rect x="-7" y="372" width="14" height="44" rx="6" fill={stoneDark} />
              <rect x="-9" y="372" width="14" height="44" rx="6" fill="url(#scStone)" />
              <rect x="-11" y="368" width="20" height="8" rx="3" fill={shade(stone, 0.3)} />
            </g>
          );
        })}
        <rect x="-20" y="352" width="1040" height="20" rx="10" fill="url(#scStone)" />
        <rect x="-20" y="368" width="1040" height="7" fill={stoneDark} opacity="0.7" />
        <rect x="-20" y="412" width="1040" height="16" rx="8" fill="url(#scStone)" />
        <rect x="-20" y="424" width="1040" height="6" fill={stoneDark} opacity="0.7" />
        {[150, 850].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <rect x="-26" y="346" width="52" height="92" rx="6" fill="url(#scStone)" />
            <rect x="-26" y="346" width="12" height="92" rx="4" fill={shade(stone, 0.35)} opacity="0.6" />
            <rect x="14" y="346" width="12" height="92" rx="4" fill={stoneDark} opacity="0.6" />
            <rect x="-34" y="340" width="68" height="12" rx="4" fill={shade(stone, 0.3)} />
            <rect x="-34" y="432" width="68" height="12" rx="4" fill={stoneDark} />
          </g>
        ))}
      </g>

      {/* terrace floor */}
      <rect x="0" y="430" width="1000" height="70" fill={shade(stone, -0.2)} />
      <rect x="0" y="430" width="1000" height="6" fill={shade(stone, 0.2)} opacity="0.7" />

      {/* flowering foreground, slightly out of focus */}
      <g filter="url(#scNear)">
        <Bush x={40} y={470} s={1.2} color={leafDark} />
        <Bush x={960} y={474} s={1.25} color={leafDark} flip />
      </g>

      {night && <rect width="1000" height="500" fill="#141a52" opacity="0.28" />}
      <rect width="1000" height="500" fill="url(#scVignette)" />
    </>
  );
}

/**
 * Painted park terrace behind the board. The SVG (with its blur filters) is drawn once into a
 * bitmap, so the scene costs nothing per frame; only the clouds move, as plain elements.
 */
export const Scenery = memo(function Scenery({ theme, lite }: { theme: WorldTheme; lite?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    setSrc("data:image/svg+xml;charset=utf-8," + encodeURIComponent(el.outerHTML));
  }, [theme]);

  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(${theme.skyTop}, ${theme.skyBottom})` }} />
      {src && (
        // a bitmap of the scene built on this device; next/image has nothing to optimize here
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="hidden">
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice">
          <Painting theme={theme} />
        </svg>
      </div>
      {!lite &&
        [
          ["cloud-drift-a", 12, 1.1],
          ["cloud-drift-b", 22, 0.8],
          ["cloud-drift-c", 7, 0.65],
        ].map(([cls, top, s], i) => (
          <div
            key={i}
            className={`pointer-events-none absolute left-0 ${cls}`}
            style={{ top: `${top}%`, opacity: theme.night ? 0.2 : 0.85, transform: `scale(${s})` }}
          >
            <div className="relative h-10 w-32">
              <div className="absolute inset-x-0 bottom-0 h-6 rounded-full bg-white" />
              <div className="absolute left-5 top-0 h-9 w-9 rounded-full bg-white" />
              <div className="absolute left-14 -top-2 h-12 w-12 rounded-full bg-white" />
              <div className="absolute right-3 top-2 h-7 w-7 rounded-full bg-white" />
            </div>
          </div>
        ))}
    </>
  );
});
