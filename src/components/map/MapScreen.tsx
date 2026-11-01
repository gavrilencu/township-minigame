"use client";

import { ChevronsLeft, Flame, Lock, Play } from "lucide-react";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { levelDifficulty } from "@/lib/game/levels";
import { mulberry32 } from "@/lib/game/rng";
import type { FriendDTO, LevelResultDTO } from "@/lib/shared";
import { play } from "@/lib/sound";
import { selectLite, useGame } from "@/lib/store";
import { LEVELS_PER_WORLD, worldOf, worldTheme } from "@/lib/worlds";
import { GiftGlyph } from "../art/Icons";
import { Decor, shade } from "../art/MapDecor";
import { WorldParticles } from "../art/Particles";
import { StarShape } from "../art/Pieces";
import { InstallButton } from "../OrientationGate";
import { Avatar } from "../ui";

const GAP = 118;
const FOOT = 170;
const SEG_W = FOOT + LEVELS_PER_WORLD * GAP;
const BACK_W = 150;
/** The far layer scrolls at this fraction of the content, for depth. */
const PARALLAX = 0.3;

/** x of the i-th node inside a world segment (can go outside the segment for neighbours). */
const xOf = (i: number) => {
  if (i < 0) return FOOT + GAP / 2 + i * GAP - FOOT;
  if (i < LEVELS_PER_WORLD) return FOOT + GAP / 2 + i * GAP;
  return FOOT + GAP / 2 + i * GAP + FOOT;
};
/** y of a level, in % of the map height. */
const yOf = (g: number) => 54 + 20 * Math.sin(g * 0.85);

function smoothPath(pts: [number, number][]): string {
  let d = `M${pts[1][0]} ${pts[1][1]}`;
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function MapScreen({ onOpenLevel, onDaily }: { onOpenLevel: (n: number) => void; onDaily: () => void }) {
  const player = useGame((s) => s.player)!;
  const results = useGame((s) => s.results);
  const friends = useGame((s) => s.friends);
  const lite = useGame(selectLite);
  const currentRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const current = player.level;
  const lastWorld = worldOf(current) + 1;
  // Only the worlds around the player are drawn, so the map stays fast at level 10 000+.
  const [back, setBack] = useState(2);
  const firstWorld = Math.max(1, worldOf(current) - back);
  const shift = useRef(0);
  const raf = useRef(0);

  // Keep the view still when earlier worlds are added on the left.
  useLayoutEffect(() => {
    if (shift.current && scrollRef.current) scrollRef.current.scrollLeft += shift.current;
    shift.current = 0;
  }, [firstWorld]);

  // Centre the current level horizontally.
  useLayoutEffect(() => {
    const sc = scrollRef.current;
    const node = currentRef.current;
    if (!sc || !node) return;
    const a = sc.getBoundingClientRect();
    const b = node.getBoundingClientRect();
    sc.scrollLeft += b.left + b.width / 2 - (a.left + a.width / 2);
    sc.style.setProperty("--sx", String(sc.scrollLeft));
  }, []);

  const friendsAt = new Map<number, FriendDTO[]>();
  for (const f of friends) friendsAt.set(f.level, [...(friendsAt.get(f.level) ?? []), f]);
  const left0 = firstWorld > 1 ? BACK_W : 0;

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="no-scrollbar flex h-full overflow-x-auto overflow-y-hidden overscroll-contain"
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
        }}
        onScroll={(e) => {
          const el = e.currentTarget;
          cancelAnimationFrame(raf.current);
          raf.current = requestAnimationFrame(() => el.style.setProperty("--sx", String(el.scrollLeft)));
        }}
      >
        {firstWorld > 1 && (
          <div className="flex h-full w-[150px] shrink-0 items-center justify-center bg-black/10">
            <button
              onClick={() => {
                play("tap");
                const next = Math.max(1, firstWorld - 5);
                shift.current = (firstWorld - next) * SEG_W;
                setBack((b) => b + 5);
              }}
              className="btn btn-purple flex-col px-3 py-2 text-[13px] leading-tight"
            >
              <ChevronsLeft className="h-6 w-6" />
              Lumile
              <br />
              anterioare
            </button>
          </div>
        )}
        {Array.from({ length: lastWorld - firstWorld + 1 }, (_, i) => firstWorld + i).map((w) => (
          <WorldSegment
            key={w}
            world={w}
            segLeft={left0 + (w - firstWorld) * SEG_W}
            lite={lite}
            current={current}
            results={results}
            friendsAt={friendsAt}
            avatar={player.avatar}
            currentRef={currentRef}
            onOpenLevel={onOpenLevel}
          />
        ))}
        <div className="h-full w-[200px] shrink-0" style={{ background: worldTheme(lastWorld + 1).skyBottom }} />
      </div>

      <button
        onClick={() => {
          play("tap");
          onOpenLevel(current);
        }}
        className="btn btn-green shine absolute bottom-[max(env(safe-area-inset-bottom),12px)] right-[max(env(safe-area-inset-right),14px)] h-14 px-6 text-[20px]"
      >
        <Play className="h-6 w-6 fill-white" /> Nivelul {current}
      </button>

      <div className="absolute left-3 top-[max(env(safe-area-inset-top),8px)]">
        <InstallButton className="h-10 px-4 text-[14px]" />
      </div>

      {player.dailyAvailable && (
        <button
          onClick={() => {
            play("tap");
            onDaily();
          }}
          className="wiggle absolute bottom-[max(env(safe-area-inset-bottom),12px)] left-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ff8ad8] to-[#d6336c] shadow-[0_4px_0_#9c1f4f]"
          aria-label="Cadou zilnic"
        >
          <GiftGlyph className="h-10 w-10" />
          <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-[#ffd23f]" />
        </button>
      )}
    </div>
  );
}

const WorldSegment = memo(function WorldSegment({
  world,
  segLeft,
  lite,
  current,
  results,
  friendsAt,
  avatar,
  currentRef,
  onOpenLevel,
}: {
  world: number;
  /** x of this segment inside the scroll content */
  segLeft: number;
  lite: boolean;
  current: number;
  results: Record<number, LevelResultDTO>;
  friendsAt: Map<number, FriendDTO[]>;
  avatar: string;
  currentRef: React.RefObject<HTMLButtonElement | null>;
  onOpenLevel: (n: number) => void;
}) {
  const theme = worldTheme(world);
  const start = (world - 1) * LEVELS_PER_WORLD + 1;
  const pts: [number, number][] = [];
  for (let i = -1; i <= LEVELS_PER_WORLD + 1; i++) pts.push([xOf(i), yOf(start + i)]);
  const d = smoothPath(pts);
  const rng = mulberry32(world * 977);
  // near props along the bottom band, far props (smaller) on the hill line
  const near = Array.from({ length: 18 }, (_, i) => ({
    kind: theme.decor[Math.floor(rng() * theme.decor.length)],
    left: FOOT + 10 + i * ((SEG_W - FOOT - 60) / 18) + rng() * 30,
    bottom: 0.5 + rng() * 8,
    size: 46 + rng() * 40,
    flip: rng() < 0.5,
  }));
  const far = Array.from({ length: lite ? 6 : 12 }, () => ({
    kind: theme.decor[Math.floor(rng() * theme.decor.length)],
    left: rng() * SEG_W * 1.3,
    top: 34 + rng() * 7,
    size: 26 + rng() * 18,
  }));
  const locked = start > current;
  const farW = SEG_W * (1 + PARALLAX);
  const leafLight = shade(theme.hillNear, 0.3);

  return (
    <section
      className="map-segment relative h-full shrink-0"
      style={{ width: SEG_W, background: `linear-gradient(to bottom, ${theme.skyTop} 0%, ${theme.skyBottom} 60%, ${shade(theme.skyBottom, 0.25)} 100%)` }}
    >
      {/* far layer: sun or moon, clouds and distant hills, moving slower than the path */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-y-0"
          style={{ left: -SEG_W * PARALLAX, width: farW, transform: `translateX(calc((var(--sx, 0) - ${segLeft}) * ${PARALLAX}px))` }}
        >
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${farW} 100`} preserveAspectRatio="none" aria-hidden>
            <path
              d={`M0 52 Q${farW * 0.12} 40 ${farW * 0.25} 48 T${farW * 0.5} 46 T${farW * 0.75} 49 T${farW} 47 V100 H0 Z`}
              fill={theme.hillFar}
              opacity="0.9"
            />
          </svg>
          {theme.night ? (
            <div className="absolute right-[18%] top-[8%] h-16 w-16 rounded-full bg-[#fff6d2] shadow-[0_0_40px_14px_rgb(255_246_210_/_0.35)]">
              <div className="absolute left-5 -top-1 h-14 w-14 rounded-full" style={{ background: theme.skyTop }} />
            </div>
          ) : (
            <div className="absolute right-[18%] top-[6%] h-20 w-20 rounded-full bg-[#fff3b0] shadow-[0_0_60px_24px_rgb(255_240_170_/_0.5)]" />
          )}
          {(lite ? [0.3] : [0.1, 0.45, 0.8]).map((x, i) => (
            <div
              key={i}
              className={`absolute ${["cloud-drift-a", "cloud-drift-b", "cloud-drift-c"][i]}`}
              style={{ left: `${x * 100}%`, top: `${8 + i * 9}%`, opacity: theme.night ? 0.25 : 0.9 }}
            >
              <div className="relative h-8 w-24">
                <div className="absolute inset-x-0 bottom-0 h-5 rounded-full bg-white" />
                <div className="absolute left-4 top-0 h-7 w-7 rounded-full bg-white" />
                <div className="absolute left-11 -top-1 h-9 w-9 rounded-full bg-white" />
              </div>
            </div>
          ))}
          {far.map((x, i) => (
            <div key={i} className="absolute" style={{ left: x.left, top: `${x.top}%`, width: x.size, height: x.size, opacity: 0.8 }}>
              <Decor kind={x.kind} color={shade(theme.hillFar, -0.2)} className="h-full w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* near hills and ground */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${SEG_W} 100`} preserveAspectRatio="none" aria-hidden>
        <path d={`M0 66 Q${SEG_W * 0.2} 56 ${SEG_W * 0.4} 64 T${SEG_W * 0.8} 62 T${SEG_W} 65 V100 H0 Z`} fill={theme.hillNear} />
        <path d={`M0 66 Q${SEG_W * 0.2} 56 ${SEG_W * 0.4} 64 T${SEG_W * 0.8} 62 T${SEG_W} 65 V72 H0 Z`} fill={leafLight} opacity="0.35" />
        <path d={`M0 88 Q${SEG_W * 0.25} 83 ${SEG_W * 0.5} 87 T${SEG_W} 86 V100 H0 Z`} fill={theme.ground} />
      </svg>

      {!lite && <WorldParticles kind={theme.particles} seed={world} count={10} />}

      {/* cobbled path */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${SEG_W} 100`} preserveAspectRatio="none" aria-hidden>
        <path d={d} fill="none" stroke="rgb(0 0 0 / 0.2)" strokeWidth="30" strokeLinecap="round" vectorEffect="non-scaling-stroke" transform="translate(0 1.4)" />
        <path d={d} fill="none" stroke={shade(theme.path, -0.18)} strokeWidth="28" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke={theme.path} strokeWidth="22" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.9" />
        <path d={d} fill="none" stroke={shade(theme.path, -0.25)} strokeWidth="6" strokeDasharray="1 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.8" />
      </svg>

      {near.map((x, i) => (
        <div
          key={i}
          className="pointer-events-none absolute"
          style={{ left: x.left, bottom: `${x.bottom}%`, width: x.size, height: x.size, transform: x.flip ? "scaleX(-1)" : undefined }}
        >
          <Decor kind={x.kind} color={theme.hillNear} className="h-full w-full" />
        </div>
      ))}

      <div className="absolute inset-y-0 left-0 flex w-[170px] items-center justify-center">
        <div className="glass-solid rounded-3xl px-4 py-3 text-center text-white shadow-lg">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">Lumea {world}</div>
          <div className="mt-0.5 text-[17px] leading-tight font-bold">{theme.name}</div>
          <div className="mt-1 text-[12px] opacity-80">
            Nivelele {start}–{start + LEVELS_PER_WORLD - 1}
          </div>
        </div>
      </div>

      {Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
        const n = start + i;
        return (
          <LevelNode
            key={n}
            n={n}
            x={xOf(i)}
            y={yOf(n)}
            state={n < current || (results[n]?.stars ?? 0) > 0 ? "done" : n === current ? "current" : "locked"}
            stars={results[n]?.stars ?? 0}
            friends={friendsAt.get(n)}
            avatar={avatar}
            nodeRef={n === current ? currentRef : undefined}
            onOpen={onOpenLevel}
          />
        );
      })}
      {locked && <div className="pointer-events-none absolute inset-0 bg-[#140a2e]/25" />}
    </section>
  );
});

const LevelNode = memo(function LevelNode({
  n,
  x,
  y,
  state,
  stars,
  friends,
  avatar,
  nodeRef,
  onOpen,
}: {
  n: number;
  x: number;
  y: number;
  state: "done" | "current" | "locked";
  stars: number;
  friends?: FriendDTO[];
  avatar: string;
  nodeRef?: React.RefObject<HTMLButtonElement | null>;
  onOpen: (n: number) => void;
}) {
  const diff = levelDifficulty(n);
  const size = state === "current" ? 66 : 56;
  const fill =
    state === "locked"
      ? "radial-gradient(circle at 35% 28%, #c3c8e6 0%, #8a90bd 45%, #5d6290 100%)"
      : state === "current"
        ? "radial-gradient(circle at 35% 28%, #ffc6ea 0%, #ff7bd0 40%, #b83dd6 100%)"
        : diff === "super"
          ? "radial-gradient(circle at 35% 28%, #e4d2ff 0%, #b48cff 40%, #7048e8 100%)"
          : diff === "hard"
            ? "radial-gradient(circle at 35% 28%, #ffc9c9 0%, #ff7a7a 40%, #e03131 100%)"
            : "radial-gradient(circle at 35% 28%, #fff1b3 0%, #ffd23f 40%, #f59f00 100%)";
  const edge =
    state === "locked" ? "#3d4170" : state === "current" ? "#7a1fa2" : diff === "super" ? "#4c2bb0" : diff === "hard" ? "#a51d1d" : "#b86a0a";
  return (
    <div className={`absolute ${state === "current" ? "z-10" : ""}`} style={{ left: x, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
      {state === "current" && (
        <>
          <span className="pulse-ring absolute inset-0 rounded-full bg-white/60" />
          <div className="float-bob absolute -top-[58px] left-1/2 -translate-x-1/2">
            <Avatar emoji={avatar} className="h-11 w-11 text-[26px]" ring="ring-[#ff8fd0]" />
            <div className="mx-auto -mt-0.5 h-0 w-0 border-x-[7px] border-t-[9px] border-x-transparent border-t-[#ff8fd0]" />
          </div>
        </>
      )}
      <button
        ref={nodeRef}
        disabled={state === "locked"}
        onClick={() => {
          play("tap");
          onOpen(n);
        }}
        className="relative flex items-center justify-center rounded-full transition-transform active:scale-90"
        style={{
          width: size,
          height: size,
          background: fill,
          boxShadow: `0 5px 0 ${edge}, 0 10px 16px rgb(0 0 0 / 0.3), inset 0 0 0 3px rgb(255 255 255 / 0.85), inset 0 -5px 0 rgb(0 0 0 / 0.12)`,
        }}
        aria-label={`Nivelul ${n}`}
      >
        <span className="absolute inset-x-3 top-1.5 h-[30%] rounded-full bg-white/45" />
        {state === "locked" ? (
          <span className="flex flex-col items-center leading-none text-white/90">
            <Lock className="h-4 w-4" strokeWidth={3} />
            <span className="text-[13px] font-bold">{n}</span>
          </span>
        ) : (
          <span className="title-stroke text-[21px] font-bold">{n}</span>
        )}
        {diff !== "normal" && state !== "locked" && (
          <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#e03131]">
            <Flame className="h-3.5 w-3.5 fill-[#ffd23f] text-[#ffd23f]" />
          </span>
        )}
      </button>
      {state === "done" && (
        <div className="absolute -bottom-2.5 left-1/2 flex -translate-x-1/2 items-end">
          {[1, 2, 3].map((s) => (
            <StarShape key={s} filled={s <= stars} className={s === 2 ? "-mb-1 h-6 w-6" : "h-5 w-5"} />
          ))}
        </div>
      )}
      {friends && friends.length > 0 && (
        <div className="absolute left-1/2 top-full mt-4 flex -translate-x-1/2 -space-x-2">
          {friends.slice(0, 3).map((f) => (
            <Avatar key={f.username} emoji={f.avatar} className="h-8 w-8 text-lg" ring="ring-[#4cb4ff]" />
          ))}
          {friends.length > 3 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4cb4ff] text-[12px] font-bold text-white ring-2 ring-white">
              +{friends.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
