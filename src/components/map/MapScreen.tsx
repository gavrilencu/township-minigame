"use client";

import { ChevronsLeft, Flame, Gift, Lock, Play } from "lucide-react";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { levelDifficulty } from "@/lib/game/levels";
import { mulberry32 } from "@/lib/game/rng";
import type { FriendDTO, LevelResultDTO } from "@/lib/shared";
import { play } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { LEVELS_PER_WORLD, worldOf, worldTheme } from "@/lib/worlds";
import { StarShape } from "../art/Pieces";
import { InstallButton } from "../OrientationGate";
import { Avatar } from "../ui";

const GAP = 118;
const FOOT = 170;
const SEG_W = FOOT + LEVELS_PER_WORLD * GAP;

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
  const currentRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const current = player.level;
  const lastWorld = worldOf(current) + 1;
  // Only the worlds around the player are drawn, so the map stays fast at level 10 000+.
  const [back, setBack] = useState(2);
  const firstWorld = Math.max(1, worldOf(current) - back);
  const shift = useRef(0);

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
  }, []);

  const friendsAt = new Map<number, FriendDTO[]>();
  for (const f of friends) friendsAt.set(f.level, [...(friendsAt.get(f.level) ?? []), f]);

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="no-scrollbar flex h-full overflow-x-auto overflow-y-hidden overscroll-contain"
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
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
          <Gift className="h-8 w-8 text-white" strokeWidth={2.4} />
          <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-[#ffd23f]" />
        </button>
      )}
    </div>
  );
}

const WorldSegment = memo(function WorldSegment({
  world,
  current,
  results,
  friendsAt,
  avatar,
  currentRef,
  onOpenLevel,
}: {
  world: number;
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
  const decor = Array.from({ length: 16 }, (_, i) => ({
    emoji: theme.decor[i % theme.decor.length],
    left: FOOT + rng() * (SEG_W - FOOT - 40),
    top: rng() < 0.5 ? 6 + rng() * 14 : 80 + rng() * 10,
    size: 26 + rng() * 18,
    rot: -15 + rng() * 30,
  }));
  const locked = start > current;

  return (
    <section
      className="map-segment relative h-full shrink-0 overflow-visible"
      style={{ width: SEG_W, background: `linear-gradient(to bottom, ${theme.skyTop} 0%, ${theme.skyBottom} 55%, ${theme.hillFar} 100%)` }}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${SEG_W} 100`} preserveAspectRatio="none" aria-hidden>
        <path d={`M0 62 Q${SEG_W * 0.15} 48 ${SEG_W * 0.3} 58 T${SEG_W * 0.6} 56 T${SEG_W} 60 V100 H0 Z`} fill={theme.hillFar} />
        <path d={`M0 76 Q${SEG_W * 0.2} 66 ${SEG_W * 0.4} 74 T${SEG_W * 0.8} 72 T${SEG_W} 75 V100 H0 Z`} fill={theme.hillNear} />
        <path d={`M0 90 Q${SEG_W * 0.25} 85 ${SEG_W * 0.5} 89 T${SEG_W} 88 V100 H0 Z`} fill={theme.ground} />
      </svg>

      {decor.map((x, i) => (
        <span
          key={i}
          className="pointer-events-none absolute select-none"
          style={{ left: x.left, top: `${x.top}%`, fontSize: x.size, transform: `rotate(${x.rot}deg)` }}
        >
          {x.emoji}
        </span>
      ))}

      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${SEG_W} 100`} preserveAspectRatio="none" aria-hidden>
        <path d={d} fill="none" stroke="rgb(0 0 0 / 0.18)" strokeWidth="28" strokeLinecap="round" vectorEffect="non-scaling-stroke" transform="translate(0 1.2)" />
        <path d={d} fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="24" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke={theme.path} strokeWidth="7" strokeDasharray="2 16" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="absolute inset-y-0 left-0 flex w-[170px] items-center justify-center">
        <div className="glass rounded-3xl px-4 py-3 text-center text-white shadow-lg">
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
  const size = state === "current" ? 64 : 54;
  const fill =
    state === "locked"
      ? "from-[#9aa0c8] to-[#5d6290]"
      : state === "current"
        ? "from-[#ff8fd0] to-[#b83dd6]"
        : diff === "super"
          ? "from-[#c9a2ff] to-[#7048e8]"
          : diff === "hard"
            ? "from-[#ff9a9a] to-[#e03131]"
            : "from-[#ffe27a] to-[#f59f00]";
  const edge =
    state === "locked" ? "#3d4170" : state === "current" ? "#7a1fa2" : diff === "super" ? "#4c2bb0" : diff === "hard" ? "#a51d1d" : "#b86a0a";
  return (
    <div className={`absolute ${state === "current" ? "z-10" : ""}`} style={{ left: x, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
      {state === "current" && (
        <>
          <span className="pulse-ring absolute inset-0 rounded-full bg-white/60" />
          <div className="float-bob absolute -top-[56px] left-1/2 -translate-x-1/2">
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
        className={`relative flex items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b ${fill} transition-transform active:scale-90`}
        style={{ width: size, height: size, boxShadow: `0 5px 0 ${edge}, 0 10px 16px rgb(0 0 0 / 0.3)` }}
        aria-label={`Nivelul ${n}`}
      >
        <span className="absolute inset-x-2 top-1 h-[38%] rounded-full bg-white/35" />
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
        <div className="absolute -bottom-3.5 left-1/2 flex -translate-x-1/2 items-end">
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
