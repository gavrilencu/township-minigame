"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Hammer } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { fallSeconds } from "@/lib/game/engine";
import type { Cell, Effect, Frame, FrameKind, Pos, Tile, TileExit } from "@/lib/game/types";
import { BlockerArt, GEM_COLORS, GrassArt, IceArt, LockArt, PieceArt, SpecialArt } from "../art/Pieces";

interface BoardProps {
  frame: Frame;
  S: number;
  /** bitmap per colour for the current cell size; null until drawn (SVG is used meanwhile) */
  sprites: string[] | null;
  effects: Effect[];
  selected: Pos | null;
  hint: Pos[] | null;
  targeting: boolean;
  /** The board element; also used to map pointer positions to cells. */
  boardRef: RefObject<HTMLDivElement | null>;
  onSwipe: (a: Pos, b: Pos) => void;
  onTap: (p: Pos) => void;
}

const same = (a: Pos | null | undefined, r: number, c: number) => !!a && a.r === r && a.c === c;

/** Hinted pieces lean towards each other; a lone special just pulses (0, 0). */
function nudgeFor(hint: Pos[] | null, r: number, c: number): { dx: number; dy: number } | null {
  if (!hint) return null;
  const i = hint.findIndex((h) => h.r === r && h.c === c);
  if (i < 0) return null;
  const other = hint[1 - i];
  return other ? { dx: other.c - c, dy: other.r - r } : { dx: 0, dy: 0 };
}

export function Board({ frame, S, sprites, effects, selected, hint, targeting, boardRef, onSwipe, onTap }: BoardProps) {
  const cells = frame.cells;
  const rows = cells.length;
  const cols = cells[0].length;
  const W = cols * S;
  const H = rows * S;
  const maskKey = cells.map((row) => row.map((c) => (c.exists ? 1 : 0)).join("")).join("|");

  const RIM = Math.max(4, Math.round(S * 0.12));
  const { clip, slots } = useMemo(() => {
    const exists = (r: number, c: number) => !!cells[r]?.[c]?.exists;
    let path = "";
    const slots: { r: number; c: number; radius: string; rim: string }[] = [];
    const R = Math.round(S * 0.3);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!exists(r, c)) continue;
        path += `M${c * S} ${r * S}h${S}v${S}h${-S}Z`;
        const up = exists(r - 1, c);
        const down = exists(r + 1, c);
        const left = exists(r, c - 1);
        const right = exists(r, c + 1);
        const rad = (a: boolean, b: boolean, extra: number) => (!a && !b ? `${R + extra}px` : "0");
        const corners = (extra: number) =>
          `${rad(up, left, extra)} ${rad(up, right, extra)} ${rad(down, right, extra)} ${rad(down, left, extra)}`;
        slots.push({ r, c, radius: corners(0), rim: corners(RIM) });
      }
    }
    return { clip: path, slots };
    // the board shape only changes between levels
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maskKey, S]);

  const tiles: { tile: Tile; r: number; c: number; locked: boolean }[] = [];
  const blockers: { cell: Cell; r: number; c: number }[] = [];
  const ice: { hp: number; r: number; c: number }[] = [];
  const grass: Pos[] = [];
  const locks: Pos[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      if (!cell.exists) continue;
      if (cell.tile) tiles.push({ tile: cell.tile, r, c, locked: cell.lock > 0 });
      if (cell.blocker) blockers.push({ cell, r, c });
      if (cell.ice > 0) ice.push({ hp: cell.ice, r, c });
      if (cell.grass) grass.push({ r, c });
      if (cell.lock > 0) locks.push({ r, c });
    }
  }

  const start = useRef<{ p: Pos; x: number; y: number; done: boolean } | null>(null);

  const cellAt = (x: number, y: number): Pos | null => {
    const rect = boardRef.current!.getBoundingClientRect();
    const c = Math.floor((x - rect.left) / S);
    const r = Math.floor((y - rect.top) / S);
    return cells[r]?.[c]?.exists ? { r, c } : null;
  };

  return (
    <div
      ref={boardRef}
      className="relative"
      style={{ width: W, height: H, touchAction: "none" }}
      onPointerDown={(e) => {
        const p = cellAt(e.clientX, e.clientY);
        if (!p) return;
        start.current = { p, x: e.clientX, y: e.clientY, done: false };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s || s.done || targeting) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < S * 0.3) return;
        s.done = true;
        const b = Math.abs(dx) > Math.abs(dy) ? { r: s.p.r, c: s.p.c + Math.sign(dx) } : { r: s.p.r + Math.sign(dy), c: s.p.c };
        onSwipe(s.p, b);
      }}
      onPointerUp={() => {
        const s = start.current;
        start.current = null;
        if (s && !s.done) onTap(s.p);
      }}
      onPointerCancel={() => (start.current = null)}
    >
      {/* Tray: a darker rim with a soft shadow, the tray face, then the lighter cells */}
      <div className="pointer-events-none absolute inset-0" style={{ filter: "drop-shadow(0 10px 14px rgb(25 30 90 / 0.4))" }}>
        {slots.map(({ r, c, rim }) => (
          <div
            key={`r${r}-${c}`}
            className="absolute"
            style={{ left: c * S - RIM, top: r * S - RIM, width: S + RIM * 2 + 0.5, height: S + RIM * 2 + 0.5, background: "#9fa9dc", borderRadius: rim }}
          />
        ))}
      </div>
      {slots.map(({ r, c, radius }) => (
        <div
          key={`s${r}-${c}`}
          className="pointer-events-none absolute"
          style={{ left: c * S, top: r * S, width: S + 0.5, height: S + 0.5, background: "#b5bde8", borderRadius: radius }}
        />
      ))}
      {slots.map(({ r, c }) => (
        <div
          key={`i${r}-${c}`}
          className="pointer-events-none absolute rounded-[20%]"
          style={{
            left: c * S + 2,
            top: r * S + 2,
            width: S - 4,
            height: S - 4,
            background: (r + c) % 2 ? "#c0c8ee" : "#c6cdf1",
            boxShadow: "inset 0 1.5px 0 rgb(255 255 255 / 0.4), inset 0 -2px 0 rgb(70 80 160 / 0.14)",
          }}
        />
      ))}

      <AnimatePresence>
        {grass.map(({ r, c }) => (
          <motion.div
            key={`g${r}-${c}`}
            className="pointer-events-none absolute"
            style={{ left: c * S + 1, top: r * S + 1, width: S - 2, height: S - 2 }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
          >
            <GrassArt />
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {ice.map(({ hp, r, c }) => (
          <motion.div
            key={`ice${r}-${c}-${hp}`}
            className="pointer-events-none absolute"
            style={{ left: c * S, top: r * S, width: S, height: S }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: [1, 1, 0], scale: [1, 1.1, 1.3], filter: ["brightness(1)", "brightness(1.6)", "brightness(2)"], transition: { duration: 0.3 } }}
          >
            <IceArt hp={hp} />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0" style={{ clipPath: `path('${clip}')` }}>
        <AnimatePresence custom={frame.removed}>
          {tiles.map(({ tile, r, c }) => (
            <TileView
              key={tile.id}
              tile={tile}
              r={r}
              c={c}
              S={S}
              mode={frame.kind}
              introDelay={tile.intro ? c * 0.035 + (rows - r) * 0.03 : 0}
              front={frame.swapped === tile.id}
              selected={same(selected, r, c)}
              nudge={nudgeFor(hint, r, c)}
              sprite={!tile.special && sprites ? sprites[tile.color] : undefined}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {locks.map(({ r, c }) => (
          <motion.div
            key={`l${r}-${c}`}
            className="pointer-events-none absolute"
            style={{ left: c * S, top: r * S, width: S, height: S }}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0, rotate: 25, transition: { duration: 0.3 } }}
          >
            <LockArt />
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {blockers.map(({ cell, r, c }) => (
          <motion.div
            key={`b${r}-${c}-${cell.blocker!.hp}`}
            className="pointer-events-none absolute p-[2px]"
            style={{ left: c * S, top: r * S, width: S, height: S }}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            exit={{ scale: [1, 1.12, 0.3], rotate: [0, -7, 14], opacity: [1, 1, 0], y: [0, -S * 0.08, S * 0.25], transition: { duration: 0.32 } }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
          >
            <BlockerArt kind={cell.blocker!.kind} hp={cell.blocker!.hp} />
          </motion.div>
        ))}
      </AnimatePresence>

      {targeting && <div className="pointer-events-none absolute -inset-1.5 animate-pulse rounded-2xl ring-4 ring-[#ffd23f]" />}

      <EffectsLayer effects={effects} S={S} W={W} H={H} />
    </div>
  );
}

const SWAP_EASE = [0.34, 1.5, 0.64, 1] as const;
const GRAVITY_EASE = [0.5, 0, 0.95, 0.5] as const;

const TileView = memo(
  function TileView({
    tile,
    r,
    c,
    S,
    mode,
    introDelay,
    front,
    selected,
    nudge,
    sprite,
  }: {
    tile: Tile;
    r: number;
    c: number;
    S: number;
    mode: FrameKind;
    introDelay: number;
    /** the piece the player dragged: rides on top during the swap */
    front: boolean;
    selected: boolean;
    /** hint: lean towards the partner piece (dx, dy in cells), or pulse for a special */
    nudge: { dx: number; dy: number } | null;
    /** pre-drawn bitmap of this piece, when available */
    sprite?: string;
  }) {
    const [rows, setRows] = useState({ cur: r, prev: tile.spawnRow ?? r });
    const [delay] = useState(introDelay);
    if (rows.cur !== r) setRows({ cur: r, prev: rows.cur });
    const dist = r - rows.prev;
    const swapping = mode === "swap" || mode === "swapBack";
    const falling = dist > 0 && !swapping && mode !== "shuffle";
    const [scope, animate] = useAnimate();

    // Squash on landing, then a little rebound.
    useEffect(() => {
      if (!falling || !scope.current) return;
      const landing = animate(
        scope.current,
        { scaleY: [1, 0.72, 1.1, 0.97, 1], scaleX: [1, 1.17, 0.94, 1.02, 1], y: [0, S * 0.04, -S * 0.1, 0, 0] },
        { delay: (rows.cur === r ? delay : 0) + fallSeconds(dist), duration: 0.42, ease: "easeOut" },
      );
      return () => landing.stop();
      // run once per landing
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [r, rows.prev]);

    const move = swapping
      ? { duration: mode === "swap" ? 0.2 : 0.24, ease: SWAP_EASE }
      : mode === "shuffle"
        ? { duration: 0.55, ease: "easeInOut" as const }
        : { duration: fallSeconds(Math.max(dist, 1)), ease: GRAVITY_EASE, delay };
    const spin = ((tile.id * 47) % 30) - 15;
    const variants = {
      exit: (removed: Record<number, TileExit> | undefined) => {
        const how = removed?.[tile.id];
        if (how?.merge) {
          // Slide into the new special and melt into it.
          return {
            x: how.merge.c * S,
            y: how.merge.r * S,
            scale: [1, 0.85, 0.5],
            opacity: [1, 1, 0],
            transition: { duration: 0.2, ease: "easeIn" as const },
          };
        }
        // Swell and flash white, then burst.
        return {
          scale: [1, 1.22, 1.32, 0],
          rotate: [0, spin * 0.3, spin, spin * 2],
          filter: ["brightness(1)", "brightness(1.45)", "brightness(2.3)", "brightness(2.3)"],
          opacity: [1, 1, 1, 0],
          transition: { duration: how?.blast ? 0.24 : 0.32, delay: how?.delay ?? 0, times: [0, 0.35, 0.6, 1] },
        };
      },
    };
    const pad = S * 0.05;
    const hintStyle = nudge
      ? ({ "--hx": `${nudge.dx * S * 0.14}px`, "--hy": `${nudge.dy * S * 0.14}px` } as React.CSSProperties)
      : undefined;
    return (
      <motion.div
        className="absolute left-0 top-0"
        style={{ width: S, height: S, padding: pad, zIndex: front ? 5 : undefined }}
        variants={variants}
        initial={{ x: c * S, y: (tile.born ? r : (tile.spawnRow ?? r)) * S, scale: tile.born ? 0 : 1 }}
        animate={{ x: c * S, y: r * S, scale: front && swapping ? [1, 1.16, 1] : 1, opacity: 1 }}
        exit="exit"
        transition={{
          x: move,
          y: move,
          scale: swapping
            ? { duration: move.duration }
            : { type: "spring", stiffness: 430, damping: 11, delay: tile.born ? 0.17 : 0 },
        }}
      >
        <div ref={scope} className="h-full w-full" style={{ transformOrigin: "50% 92%" }}>
          <div
            className={`h-full w-full ${selected ? "tile-selected" : nudge ? (nudge.dx || nudge.dy ? "tile-nudge" : "tile-hint") : ""}`}
            style={hintStyle}
          >
            <div
              key={tile.special ?? "gem"}
              className={`relative h-full w-full ${tile.special ? "piece-in" : tile.id % 5 === 0 ? "idle-shine" : ""}`}
              style={tile.special ? undefined : { animationDelay: `${(tile.id % 13) * 0.9}s` }}
            >
              {sprite ? (
                // a data-URL bitmap drawn on this device; next/image has nothing to optimize here
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sprite} alt="" draggable={false} className="block h-full w-full select-none" />
              ) : (
                <PieceArt tile={tile} />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
  (a, b) =>
    a.sprite === b.sprite &&
    a.tile.id === b.tile.id &&
    a.tile.special === b.tile.special &&
    a.tile.color === b.tile.color &&
    a.r === b.r &&
    a.c === b.c &&
    a.S === b.S &&
    a.front === b.front &&
    a.selected === b.selected &&
    a.nudge?.dx === b.nudge?.dx &&
    a.nudge?.dy === b.nudge?.dy &&
    !a.nudge === !b.nudge,
);

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

type ShardKind = "gem" | "crate" | "cloud" | "ice" | "lock";

const SHARD_COLORS: Record<Exclude<ShardKind, "gem">, string[]> = {
  crate: ["#d08a45", "#f7c98c", "#a86a33"],
  cloud: ["#ffffff", "#ffd6ec", "#ffb3da"],
  ice: ["#e9f9ff", "#b5e4ff", "#ffffff"],
  lock: ["#dfe3ef", "#9aa3c0", "#ffc93c"],
};

const SHARD_CLIPS = [
  "polygon(50% 0, 100% 65%, 25% 100%)",
  "polygon(0 20%, 80% 0, 100% 75%, 30% 100%)",
  "polygon(20% 0, 100% 30%, 60% 100%, 0 70%)",
  "polygon(50% 0, 90% 50%, 50% 100%, 10% 50%)",
];

const STAR_CLIP = "polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)";

/** How loud each cascade banner gets: size and colour grow with the level. */
const BANNER_LEVEL: Record<string, number> = {
  "Bine!": 1,
  "Super!": 2,
  "Minunat!": 3,
  "Fantastic!": 4,
  "Combo!": 4,
  "Bravo!": 4,
  "Mutări bonus!": 3,
  "Amestecăm!": 1,
};

/**
 * A burst of debris. Pieces fly out, slow down and fall under gravity while spinning;
 * a few sparkles twinkle out and the colored flash marks the impact.
 */
function Burst({ x, y, kind, colors, S, seed, delay }: { x: number; y: number; kind: ShardKind; colors: string[]; S: number; seed: number; delay: number }) {
  const count = kind === "cloud" ? 7 : kind === "crate" ? 7 : 9;
  const rnd = (i: number, m: number) => ((seed * 31 + i * 17) % m) / m;
  const wait = `${delay}s`;
  return (
    <>
      <div className="fx-flash" style={{ left: x, top: y, width: S * 1.3, height: S * 1.3, animationDelay: wait }} />
      {kind === "gem" && (
        <div className="fx-ring" style={{ left: x, top: y, width: S * 1.1, height: S * 1.1, borderColor: colors[1], animationDelay: wait }} />
      )}
      {Array.from({ length: count }, (_, i) => {
        const ang = (i / count) * Math.PI * 2 + rnd(i, 10) * 0.8;
        const reach = S * (kind === "cloud" ? 0.45 : 0.55 + rnd(i, 7) * 0.5);
        const base = {
          left: x,
          top: y,
          animationDelay: wait,
          "--dx": `${Math.cos(ang) * reach}px`,
          "--dy": `${Math.sin(ang) * reach - S * 0.35}px`,
          "--fall": `${S * (0.9 + rnd(i, 5) * 0.6)}px`,
          "--rot": `${(i % 2 ? 1 : -1) * (200 + rnd(i, 9) * 300)}deg`,
        } as React.CSSProperties;
        if (kind === "cloud") {
          const size = S * (0.32 + rnd(i, 4) * 0.2);
          return <div key={i} className="fx-puff" style={{ ...base, width: size, height: size, background: colors[i % colors.length] }} />;
        }
        if (kind === "crate") {
          return (
            <div
              key={i}
              className="fx-shard"
              style={{ ...base, width: S * 0.42, height: S * 0.13, borderRadius: 3, background: colors[i % colors.length], boxShadow: "inset 0 -2px 0 rgb(92 51 23 / 0.5)" }}
            />
          );
        }
        if (kind === "lock") {
          const size = S * 0.2;
          return <div key={i} className="fx-shard" style={{ ...base, width: size, height: size * 0.7, borderRadius: size, border: `${Math.max(2, S * 0.05)}px solid ${colors[i % colors.length]}` }} />;
        }
        const size = S * (0.16 + rnd(i, 6) * 0.14);
        return (
          <div
            key={i}
            className="fx-shard"
            style={{
              ...base,
              width: size,
              height: size,
              background: `linear-gradient(135deg, ${colors[1]}, ${colors[0]} 55%, ${colors[2]})`,
              clipPath: SHARD_CLIPS[i % SHARD_CLIPS.length],
            }}
          />
        );
      })}
      {kind !== "cloud" &&
        Array.from({ length: 3 }, (_, i) => {
          const ang = rnd(i + 20, 13) * Math.PI * 2;
          const size = S * (0.18 + rnd(i, 3) * 0.1);
          return (
            <div
              key={`s${i}`}
              className="fx-spark"
              style={
                {
                  left: x,
                  top: y,
                  width: size,
                  height: size,
                  clipPath: STAR_CLIP,
                  background: i % 2 ? "#fff6b3" : "#ffffff",
                  animationDelay: `${delay + i * 0.05}s`,
                  "--dx": `${Math.cos(ang) * S * 0.8}px`,
                  "--dy": `${Math.sin(ang) * S * 0.8}px`,
                } as React.CSSProperties
              }
            />
          );
        })}
    </>
  );
}

const EffectsLayer = memo(function EffectsLayer({ effects, S, W, H }: { effects: Effect[]; S: number; W: number; H: number }) {
  const cx = (c: number) => c * S + S / 2;
  const cy = (r: number) => r * S + S / 2;
  return (
    <div className="pointer-events-none absolute inset-0">
      {effects.map((e) => {
        switch (e.type) {
          case "pop": {
            const g = GEM_COLORS[e.color] ?? GEM_COLORS[0];
            return <Burst key={e.id} x={cx(e.c)} y={cy(e.r)} kind="gem" colors={[g.base, g.light, g.dark]} S={S} seed={e.id} delay={e.delay} />;
          }
          case "shard":
            return <Burst key={e.id} x={cx(e.c)} y={cy(e.r)} kind={e.kind} colors={SHARD_COLORS[e.kind]} S={S} seed={e.id} delay={e.delay} />;
          case "create":
            return (
              <div key={e.id}>
                <div className="fx-ring" style={{ left: cx(e.c), top: cy(e.r), width: S * 2.2, height: S * 2.2 }} />
                <div className="fx-flash" style={{ left: cx(e.c), top: cy(e.r), width: S * 2, height: S * 2 }} />
              </div>
            );
          case "beam":
            return e.dir === "h" ? (
              <div key={e.id}>
                <div
                  className="fx-beam-h absolute left-0"
                  style={{
                    top: cy(e.r) - S * 0.32,
                    width: W,
                    height: S * 0.64,
                    transformOrigin: `${cx(e.c)}px 50%`,
                    background: "linear-gradient(180deg, transparent, rgb(255 220 120 / 0.9) 28%, #fff 50%, rgb(255 220 120 / 0.9) 72%, transparent)",
                    boxShadow: "0 0 22px 8px rgb(255 170 60 / 0.6)",
                    borderRadius: S,
                  }}
                />
                {[-1, 1].map((d) => (
                  <motion.div
                    key={d}
                    className="absolute left-0 top-0"
                    style={{ width: S * 1.1, height: S * 1.1, rotate: d < 0 ? 180 : 0 }}
                    initial={{ x: cx(e.c) - S / 2, y: cy(e.r) - S / 2 }}
                    animate={{ x: d < 0 ? -S * 1.3 : W + S * 0.3 }}
                    transition={{ duration: (d < 0 ? e.c + 1.8 : W / S - e.c + 0.8) * e.pace, ease: "linear" }}
                  >
                    <SpecialArt kind="rocketH" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div key={e.id}>
                <div
                  className="fx-beam-v absolute top-0"
                  style={{
                    left: cx(e.c) - S * 0.32,
                    height: H,
                    width: S * 0.64,
                    transformOrigin: `50% ${cy(e.r)}px`,
                    background: "linear-gradient(90deg, transparent, rgb(255 220 120 / 0.9) 28%, #fff 50%, rgb(255 220 120 / 0.9) 72%, transparent)",
                    boxShadow: "0 0 22px 8px rgb(255 170 60 / 0.6)",
                    borderRadius: S,
                  }}
                />
                {[-1, 1].map((d) => (
                  <motion.div
                    key={d}
                    className="absolute left-0 top-0"
                    style={{ width: S * 1.1, height: S * 1.1, rotate: d < 0 ? 180 : 0 }}
                    initial={{ x: cx(e.c) - S / 2, y: cy(e.r) - S / 2 }}
                    animate={{ y: d < 0 ? -S * 1.3 : H + S * 0.3 }}
                    transition={{ duration: (d < 0 ? e.r + 1.8 : H / S - e.r + 0.8) * e.pace, ease: "linear" }}
                  >
                    <SpecialArt kind="rocketV" />
                  </motion.div>
                ))}
              </div>
            );
          case "blast": {
            const size = Math.min((e.radius * 2 + 1) * S * 1.15, Math.max(W, H) * 1.6);
            return (
              <div key={e.id}>
                <div className="fx-blast" style={{ left: cx(e.c), top: cy(e.r), width: size, height: size }} />
                <div className="fx-ring" style={{ left: cx(e.c), top: cy(e.r), width: size * 0.9, height: size * 0.9 }} />
              </div>
            );
          }
          case "plane": {
            const x0 = cx(e.c) - S / 2;
            const y0 = cy(e.r) - S / 2;
            const x1 = cx(e.tc) - S / 2;
            const y1 = cy(e.tr) - S / 2;
            return (
              <motion.div
                key={e.id}
                className="absolute left-0 top-0"
                style={{ width: S * 1.15, height: S * 1.15, scaleX: x1 >= x0 ? 1 : -1 }}
                initial={{ x: x0, y: y0, scale: 0.6 }}
                animate={{ x: [x0, (x0 + x1) / 2, x1], y: [y0, Math.min(y0, y1) - S * 1.6, y1], scale: [0.8, 1.5, 0.9] }}
                transition={{ duration: 0.42, ease: "easeInOut" }}
              >
                <SpecialArt kind="plane" />
              </motion.div>
            );
          }
          case "rainbow":
            return (
              <svg key={e.id} className="absolute inset-0 overflow-visible" width={W} height={H}>
                {e.targets.map((t, i) => (
                  <g key={i} style={{ animationDelay: `${Math.min(i * e.pace, 0.5)}s` }} className="fx-rainbow-group">
                    <line className="fx-rainbow-line" x1={cx(e.c)} y1={cy(e.r)} x2={cx(t.c)} y2={cy(t.r)} stroke="#ff9ff3" strokeWidth={S * 0.24} strokeLinecap="round" opacity="0.7" />
                    <line className="fx-rainbow-line" x1={cx(e.c)} y1={cy(e.r)} x2={cx(t.c)} y2={cy(t.r)} stroke="#fff" strokeWidth={S * 0.09} strokeLinecap="round" />
                  </g>
                ))}
              </svg>
            );
          case "score":
            return (
              <div
                key={e.id}
                className="fx-score"
                style={{
                  left: cx(e.c),
                  top: cy(e.r),
                  fontSize: Math.max(13, S * 0.44),
                  WebkitTextStroke: `${Math.max(2, S * 0.08)}px ${e.color >= 0 ? GEM_COLORS[e.color].depth : "#5b2fd0"}`,
                  paintOrder: "stroke fill",
                }}
              >
                +{e.value}
              </div>
            );
          case "hammer":
            return (
              <div key={e.id}>
                <div className="fx-hammer absolute" style={{ left: cx(e.c), top: cy(e.r) }}>
                  <Hammer className="text-[#ffb347] drop-shadow-[0_3px_0_#8a4b00]" style={{ width: S * 1.3, height: S * 1.3 }} strokeWidth={2.4} />
                </div>
                <div className="fx-ring" style={{ left: cx(e.c), top: cy(e.r), width: S * 1.8, height: S * 1.8 }} />
              </div>
            );
          case "banner": {
            const lvl = BANNER_LEVEL[e.text] ?? 2;
            return (
              <div key={e.id} className="absolute inset-0 flex items-center justify-center">
                <div className={`fx-banner fx-banner-text fx-banner-l${lvl}`} style={{ fontSize: Math.max(32, S * (0.85 + lvl * 0.14)) }}>
                  {e.text}
                </div>
              </div>
            );
          }
          case "collect":
            return null;
        }
      })}
    </div>
  );
});
