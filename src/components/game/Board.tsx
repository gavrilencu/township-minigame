"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Hammer } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { fallSeconds } from "@/lib/game/engine";
import type { Cell, Effect, Frame, FrameKind, Pos, Tile } from "@/lib/game/types";
import { BlockerArt, GEM_COLORS, GrassArt, IceArt, LockArt, PieceArt, SpecialArt } from "../art/Pieces";

interface BoardProps {
  frame: Frame;
  S: number;
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

export function Board({ frame, S, effects, selected, hint, targeting, boardRef, onSwipe, onTap }: BoardProps) {
  const cells = frame.cells;
  const rows = cells.length;
  const cols = cells[0].length;
  const W = cols * S;
  const H = rows * S;
  const maskKey = cells.map((row) => row.map((c) => (c.exists ? 1 : 0)).join("")).join("|");

  const { clip, slots } = useMemo(() => {
    const exists = (r: number, c: number) => !!cells[r]?.[c]?.exists;
    let path = "";
    const slots: { r: number; c: number; radius: string }[] = [];
    const R = Math.round(S * 0.3);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!exists(r, c)) continue;
        path += `M${c * S} ${r * S}h${S}v${S}h${-S}Z`;
        const up = exists(r - 1, c);
        const down = exists(r + 1, c);
        const left = exists(r, c - 1);
        const right = exists(r, c + 1);
        const rad = (a: boolean, b: boolean) => (!a && !b ? `${R}px` : "0");
        slots.push({ r, c, radius: `${rad(up, left)} ${rad(up, right)} ${rad(down, right)} ${rad(down, left)}` });
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
      {/* Board shape with a white outline */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          filter:
            "drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff) drop-shadow(0 8px 14px rgb(20 30 80 / 0.45))",
        }}
      >
        {slots.map(({ r, c, radius }) => (
          <div
            key={`s${r}-${c}`}
            className="absolute"
            style={{ left: c * S, top: r * S, width: S + 0.5, height: S + 0.5, background: "#8fabe6", borderRadius: radius }}
          />
        ))}
      </div>
      {slots.map(({ r, c }) => (
        <div
          key={`i${r}-${c}`}
          className="pointer-events-none absolute rounded-[24%]"
          style={{
            left: c * S + 1.5,
            top: r * S + 1.5,
            width: S - 3,
            height: S - 3,
            background: (r + c) % 2 ? "#bcd1f7" : "#c9dafa",
            boxShadow: "inset 0 -3px 0 rgb(80 110 190 / 0.25), inset 0 2px 0 rgb(255 255 255 / 0.6)",
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
            exit={{ opacity: 0, scale: 1.25, transition: { duration: 0.25 } }}
          >
            <IceArt hp={hp} />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0" style={{ clipPath: `path('${clip}')` }}>
        <AnimatePresence>
          {tiles.map(({ tile, r, c }) => (
            <TileView
              key={tile.id}
              tile={tile}
              r={r}
              c={c}
              S={S}
              mode={frame.kind}
              introDelay={tile.intro ? c * 0.035 + (rows - r) * 0.03 : 0}
              selected={same(selected, r, c)}
              hinted={!!hint?.some((h) => h.r === r && h.c === c)}
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
            exit={{ scale: 1.3, opacity: 0, rotate: -8, transition: { duration: 0.24 } }}
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

const TileView = memo(
  function TileView({
    tile,
    r,
    c,
    S,
    mode,
    introDelay,
    selected,
    hinted,
  }: {
    tile: Tile;
    r: number;
    c: number;
    S: number;
    mode: FrameKind;
    introDelay: number;
    selected: boolean;
    hinted: boolean;
  }) {
    const [rows, setRows] = useState({ cur: r, prev: tile.spawnRow ?? r });
    const [delay] = useState(introDelay);
    if (rows.cur !== r) setRows({ cur: r, prev: rows.cur });
    const dist = r - rows.prev;
    const falling = dist > 0 && mode !== "swap" && mode !== "swapBack" && mode !== "shuffle";
    const [scope, animate] = useAnimate();

    // Squash-and-stretch when a piece lands.
    useEffect(() => {
      if (!falling || !scope.current) return;
      const landing = animate(
        scope.current,
        { scaleY: [1, 0.74, 1.08, 1], scaleX: [1, 1.16, 0.95, 1] },
        { delay: (rows.cur === r ? delay : 0) + fallSeconds(dist), duration: 0.32, ease: "easeOut" },
      );
      return () => landing.stop();
      // run once per landing
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [r, rows.prev]);

    const move =
      mode === "swap" || mode === "swapBack"
        ? { duration: 0.17, ease: "easeInOut" as const }
        : mode === "shuffle"
          ? { duration: 0.5, ease: "easeInOut" as const }
          : { duration: fallSeconds(Math.max(dist, 1)), ease: [0.55, 0, 1, 0.45] as const, delay };
    const pad = S * 0.05;
    return (
      <motion.div
        className="absolute left-0 top-0"
        style={{ width: S, height: S, padding: pad }}
        initial={{ x: c * S, y: (tile.born ? r : (tile.spawnRow ?? r)) * S, scale: tile.born ? 0 : 1 }}
        animate={{ x: c * S, y: r * S, scale: 1, opacity: 1 }}
        exit={{ scale: [1, 1.3, 0], opacity: [1, 1, 0], transition: { duration: 0.26, times: [0, 0.35, 1] } }}
        transition={{ x: move, y: move, scale: { type: "spring", stiffness: 520, damping: 14 } }}
      >
        <div ref={scope} className="h-full w-full" style={{ transformOrigin: "50% 92%" }}>
          <div className={`h-full w-full ${selected ? "tile-selected" : hinted ? "tile-hint" : ""}`}>
            <div
              key={tile.special ?? "gem"}
              className={`relative h-full w-full ${tile.special ? "piece-in" : tile.id % 5 === 0 ? "idle-shine" : ""}`}
              style={tile.special ? undefined : { animationDelay: `${(tile.id % 13) * 0.9}s` }}
            >
              <PieceArt tile={tile} />
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
  (a, b) =>
    a.tile.id === b.tile.id &&
    a.tile.special === b.tile.special &&
    a.tile.color === b.tile.color &&
    a.r === b.r &&
    a.c === b.c &&
    a.S === b.S &&
    a.selected === b.selected &&
    a.hinted === b.hinted,
);

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

const SHARD_COLORS = {
  crate: ["#d08a45", "#f7c98c", "#7d4520"],
  cloud: ["#ffd6ec", "#ff9fd0", "#fff"],
  ice: ["#e1f7ff", "#9fd8ff", "#fff"],
  lock: ["#c3cbe0", "#8d96b3", "#ffc93c"],
};

function Particles({
  x,
  y,
  colors,
  S,
  seed,
  count = 8,
  round = false,
}: {
  x: number;
  y: number;
  colors: string[];
  S: number;
  seed: number;
  count?: number;
  round?: boolean;
}) {
  return (
    <>
      <div className="fx-flash" style={{ left: x, top: y, width: S * 1.2, height: S * 1.2 }} />
      {Array.from({ length: count }, (_, i) => {
        const ang = (i / count) * Math.PI * 2 + ((seed * 37) % 10) / 10;
        const dist = S * (0.75 + (((seed + i) * 53) % 10) / 18);
        const size = S * (0.15 + (((seed + i) * 17) % 5) / 45);
        return (
          <div
            key={i}
            className="fx-particle"
            style={
              {
                left: x,
                top: y,
                width: size,
                height: size,
                borderRadius: round || i % 3 === 0 ? "50%" : "30%",
                background: colors[i % colors.length],
                boxShadow: "0 0 5px rgb(255 255 255 / 0.7)",
                "--dx": `${Math.cos(ang) * dist}px`,
                "--dy": `${Math.sin(ang) * dist}px`,
                "--rot": `${(i % 2 ? 1 : -1) * 260}deg`,
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
            return <Particles key={e.id} x={cx(e.c)} y={cy(e.r)} colors={[g.base, g.light, g.dark, "#fff"]} S={S} seed={e.id} />;
          }
          case "shard":
            return (
              <Particles key={e.id} x={cx(e.c)} y={cy(e.r)} colors={SHARD_COLORS[e.kind]} S={S} seed={e.id} count={9} round={e.kind === "cloud"} />
            );
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
                    transition={{ duration: 0.38, ease: "easeIn" }}
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
                    transition={{ duration: 0.38, ease: "easeIn" }}
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
                  <g key={i}>
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
          case "banner":
            return (
              <div key={e.id} className="absolute inset-0 flex items-center justify-center">
                <div className="fx-banner title-stroke font-bold" style={{ fontSize: Math.max(34, S * 1.15) }}>
                  {e.text}
                </div>
              </div>
            );
          case "collect":
            return null;
        }
      })}
    </div>
  );
});
