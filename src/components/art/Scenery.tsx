import { memo } from "react";
import type { WorldTheme } from "@/lib/worlds";

function CloudShape({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff">
      <ellipse cx="0" cy="0" rx="46" ry="20" opacity="0.95" />
      <circle cx="-18" cy="-12" r="20" />
      <circle cx="12" cy="-20" r="26" />
      <circle cx="36" cy="-6" r="16" />
    </g>
  );
}

function Tree({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-5" y="-6" width="10" height="34" rx="4" fill="#7a4a24" />
      <circle cx="0" cy="-26" r="28" fill={color} />
      <circle cx="-16" cy="-12" r="18" fill={color} />
      <circle cx="17" cy="-12" r="18" fill={color} />
      <circle cx="-8" cy="-36" r="10" fill="#fff" opacity="0.22" />
    </g>
  );
}

/** Animated cartoon landscape used behind the board. */
export const Scenery = memo(function Scenery({ theme }: { theme: WorldTheme }) {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.skyTop} />
          <stop offset="1" stopColor={theme.skyBottom} />
        </linearGradient>
        <radialGradient id="sunGlow">
          <stop offset="0" stopColor="#fff7c2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff7c2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="500" fill="url(#skyGrad)" />
      <g transform="translate(820 90)">
        <circle r="120" fill="url(#sunGlow)" />
        <g className="sun-rays" opacity="0.35">
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="-4" y="-110" width="8" height="40" rx="4" fill="#fff6c0" transform={`rotate(${i * 30})`} />
          ))}
        </g>
        <circle r="44" fill="#ffe36b" />
        <circle r="44" fill="none" stroke="#fff3b0" strokeWidth="6" opacity="0.7" />
      </g>
      <g className="cloud-drift-a">
        <CloudShape x={120} y={90} s={1.2} />
      </g>
      <g className="cloud-drift-b">
        <CloudShape x={480} y={60} s={0.9} />
      </g>
      <g className="cloud-drift-c">
        <CloudShape x={300} y={150} s={0.7} />
      </g>
      <path d="M0 330 Q120 250 260 300 T520 290 T780 280 T1000 300 V500 H0 Z" fill={theme.hillFar} />
      <Tree x={160} y={300} s={0.9} color={theme.hillNear} />
      <Tree x={860} y={295} s={1.1} color={theme.hillNear} />
      <Tree x={940} y={310} s={0.7} color={theme.hillNear} />
      <path d="M0 390 Q160 330 330 370 T660 365 T1000 360 V500 H0 Z" fill={theme.hillNear} />
      <Tree x={70} y={380} s={1.2} color={theme.ground} />
      <Tree x={960} y={385} s={1.3} color={theme.ground} />
      <path d="M0 450 Q250 420 500 440 T1000 430 V500 H0 Z" fill={theme.ground} />
      {Array.from({ length: 14 }, (_, i) => (
        <g key={i} transform={`translate(${30 + i * 70} ${462 + (i % 3) * 10})`} className="sway" style={{ animationDelay: `${(i % 5) * 0.4}s` }}>
          <path d="M0 0 C-2 -10 2 -16 0 -22" stroke="#2e7d32" strokeWidth="3" fill="none" />
          <circle cx="0" cy="-24" r="5" fill={["#ff8fb1", "#ffd23f", "#ffffff", "#b48cff"][i % 4]} />
          <circle cx="0" cy="-24" r="2" fill="#ffb300" />
        </g>
      ))}
    </svg>
  );
});
