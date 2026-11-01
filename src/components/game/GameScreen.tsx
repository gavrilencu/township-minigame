"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Check, Plus, Settings, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  BOOSTERS,
  computeStars,
  CONTINUE_MOVES,
  continuePrice,
  INGAME_BOOSTERS,
  PRE_TO_SPECIAL,
  type InGameBooster,
  type PreBooster,
} from "@/lib/game/economy";
import { Engine } from "@/lib/game/engine";
import { generateLevel } from "@/lib/game/levels";
import type { Effect, Frame, Goal, Pos, SpecialKind } from "@/lib/game/types";
import { assistMoves } from "@/lib/shared";
import { play, unlockAudio } from "@/lib/sound";
import { pieceSprites } from "@/lib/sprites";
import { useGame } from "@/lib/store";
import { worldOf, worldTheme } from "@/lib/worlds";
import { WorldParticles } from "../art/Particles";
import { GEM_COLORS, GemDefs, GoalIcon, PieceSources, StarShape } from "../art/Pieces";
import { Scenery } from "../art/Scenery";
import { BoosterIcon, formatNumber } from "../ui";
import { Board } from "./Board";
import { BuyBoosterModal, FailModal, type FinishState, OutOfMovesModal, PauseModal, WinModal } from "./GameModals";

type Phase = "intro" | "play" | "busy" | "won" | "outOfMoves" | "done" | "failed";

interface Flyer {
  id: number;
  goal: Goal;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  size: number;
}

interface StarFlyer {
  id: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const adjacent = (a: Pos, b: Pos) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

/** A frame worth a hit-stop: a big explosion or a special combo. */
const isBig = (f: Frame) => f.effects.some((e) => (e.type === "blast" && e.radius >= 2) || (e.type === "banner" && (e.text === "Combo!" || e.text === "Fantastic!")));

const TARGET_TEXT: Partial<Record<InGameBooster, string>> = {
  hammer: "Atinge piesa sau obstacolul de spart",
  row: "Atinge rândul pe care vrei să-l cureți",
  col: "Atinge coloana pe care vrei s-o cureți",
};

export function GameScreen({
  level,
  pre,
  onExit,
}: {
  level: number;
  pre: PreBooster[];
  /** Leave the level; with a level number the start dialog for that level opens next. */
  onExit: (openLevel?: number) => void;
}) {
  const player = useGame((s) => s.player)!;
  const sound = useGame((s) => s.sound);
  const music = useGame((s) => s.music);
  const toggleSound = useGame((s) => s.toggleSound);
  const toggleMusic = useGame((s) => s.toggleMusic);
  const setPlayer = useGame((s) => s.setPlayer);
  const setResult = useGame((s) => s.setResult);
  const spendBoosterLocal = useGame((s) => s.spendBoosterLocal);
  const toast = useGame((s) => s.toast);
  const prior = useGame((s) => s.results[level]);

  const cfg = useMemo(() => {
    const base = generateLevel(level);
    const bonus = (prior?.stars ?? 0) > 0 ? 0 : assistMoves(prior?.fails ?? 0);
    return { ...base, moves: base.moves + bonus, baseMoves: base.moves, bonus };
    // the level config is fixed for the lifetime of this screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const [engine] = useState(
    () =>
      new Engine(cfg, {
        pre: pre.map((p): SpecialKind => (p === "preRocket" ? (Math.random() < 0.5 ? "rocketH" : "rocketV") : PRE_TO_SPECIAL[p])),
      }),
  );
  const [frame, setFrame] = useState<Frame>(() => engine.snapshotFrame());
  const [effects, setEffects] = useState<Effect[]>([]);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [selected, setSelected] = useState<Pos | null>(null);
  const [hint, setHint] = useState<Pos[] | null>(null);
  const [booster, setBooster] = useState<InGameBooster | null>(null);
  const [buyAsk, setBuyAsk] = useState<InGameBooster | null>(null);
  const [buying, setBuying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [continues, setContinues] = useState(0);
  const [finish, setFinish] = useState<FinishState | null>(null);
  const [win, setWin] = useState<{ movesLeft: number; stars: number } | null>(null);
  const [S, setS] = useState(40);
  const [sprites, setSprites] = useState<string[] | null>(null);
  const [flash, setFlash] = useState(0);
  const [starFlyers, setStarFlyers] = useState<StarFlyer[]>([]);
  const [arrived, setArrived] = useState(0);
  const areaRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const goalRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [shakeScope, shakeAnimate] = useAnimate();
  const alive = useRef(true);
  const fxId = useRef(-1);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setS(Math.max(22, Math.floor(Math.min((width - 16) / engine.cols, (height - 14 - 30) / engine.rows, 64))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [engine]);

  // Pieces as bitmaps for this cell size; the board shows SVG until they are ready.
  useEffect(() => {
    let live = true;
    const px = Math.round(S * Math.min(3, window.devicePixelRatio || 1));
    void pieceSprites(px, GEM_COLORS.length).then((s) => live && setSprites(s));
    return () => {
      live = false;
    };
  }, [S]);

  useEffect(() => {
    const t = setTimeout(() => alive.current && setPhase("play"), 1900);
    return () => clearTimeout(t);
  }, []);

  const addEffects = useCallback((fx: Effect[]) => {
    if (!fx.length) return;
    setEffects((prev) => [...prev, ...fx]);
    const ids = new Set(fx.map((f) => f.id));
    // long enough for the slowest debris of a delayed ripple to land
    setTimeout(() => alive.current && setEffects((prev) => prev.filter((e) => !ids.has(e.id))), 1800);
  }, []);

  /** Collected pieces fly from the board to their goal in the side panel. */
  const launchFlyers = useCallback(
    (f: Frame) => {
      const board = boardRef.current?.getBoundingClientRect();
      if (!board) return;
      const out: Flyer[] = [];
      for (const e of f.effects) {
        if (e.type !== "collect" || out.length >= 10) continue;
        const slot = goalRefs.current[e.goal]?.getBoundingClientRect();
        if (!slot) continue;
        out.push({
          id: e.id,
          goal: f.goals[e.goal],
          x0: board.left + e.c * S + S / 2,
          y0: board.top + e.r * S + S / 2,
          x1: slot.left + slot.width / 2,
          y1: slot.top + slot.height / 2,
          size: S * 0.8,
        });
      }
      if (!out.length) return;
      setFlyers((prev) => [...prev, ...out]);
      const ids = new Set(out.map((o) => o.id));
      setTimeout(() => alive.current && setFlyers((prev) => prev.filter((o) => !ids.has(o.id))), 800);
    },
    [S],
  );

  const banner = (text: string) => addEffects([{ id: fxId.current--, type: "banner", text }]);

  function shake(f: Frame) {
    const big = f.effects.some((e) => (e.type === "blast" && e.radius >= 2) || (e.type === "banner" && e.text === "Combo!"));
    if (!big || !shakeScope.current) return;
    void shakeAnimate(shakeScope.current, { x: [0, -8, 8, -6, 5, -2, 0], y: [0, 4, -4, 3, -2, 1, 0] }, { duration: 0.42 });
  }

  async function runFrames(frames: Frame[], speed = 1) {
    for (const f of frames) {
      if (!alive.current) return;
      setFrame(f);
      addEffects(f.effects);
      launchFlyers(f);
      shake(f);
      for (const s of f.sounds) play(s, f.cascade);
      // hit-stop: a big impact flashes the screen and holds for a few frames
      const big = isBig(f);
      if (big) setFlash((k) => k + 1);
      await wait(f.duration / speed + (big ? 90 : 0));
    }
  }

  /** Earned stars fly from the board into the star pill, one by one. */
  function flyStars(count: number) {
    const board = boardRef.current?.getBoundingClientRect();
    const pill = starsRef.current?.getBoundingClientRect();
    if (!board || !pill) return setArrived(count);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!alive.current) return;
        const id = fxId.current--;
        setStarFlyers((prev) => [
          ...prev,
          { id, x0: board.left + board.width / 2 + (i - 1) * 40, y0: board.top + board.height / 2, x1: pill.left + 16 + i * 16, y1: pill.top + pill.height / 2 },
        ]);
        play("star");
        setTimeout(() => {
          if (!alive.current) return;
          setStarFlyers((prev) => prev.filter((f) => f.id !== id));
          setArrived((n) => Math.max(n, i + 1));
        }, 620);
      }, i * 260);
    }
  }

  async function submit(won: boolean, movesLeft = 0) {
    setFinish({ status: "loading" });
    try {
      const data = await api.finish(player.username, { level, won, score: engine.score, movesLeft, continues });
      if (!alive.current) return;
      setPlayer(data.player);
      setResult(data.result);
      setFinish({ status: "ok", data });
      if (won && data.reward) play("coin");
    } catch (e) {
      if (alive.current) setFinish({ status: "error", error: (e as Error).message });
    }
  }

  async function celebrate() {
    setPhase("won");
    const movesLeft = engine.movesLeft;
    const result = { movesLeft, stars: computeStars(movesLeft, cfg.baseMoves) };
    setWin(result);
    play("win");
    banner("Bravo!");
    await wait(500);
    flyStars(result.stars);
    await wait(1000 + result.stars * 260);
    if (engine.movesLeft > 0) {
      banner("Mutări bonus!");
      await wait(500);
      await runFrames(engine.bonusRound(), 1.5);
    }
    await wait(500);
    if (!alive.current) return;
    setPhase("done");
    void submit(true, result.movesLeft);
  }

  async function perform(frames: Frame[] | null) {
    if (!frames?.length) return;
    setPhase("busy");
    setHint(null);
    setSelected(null);
    await runFrames(frames);
    if (!alive.current) return;
    if (engine.isWon()) return celebrate();
    if (engine.movesLeft <= 0) {
      play("lose");
      setPhase("outOfMoves");
      return;
    }
    setPhase("play");
  }

  function doSwap(a: Pos, b: Pos) {
    setSelected(null);
    const res = engine.trySwap(a, b);
    if (res) void perform(res.frames);
  }

  function consume(id: InGameBooster) {
    spendBoosterLocal(id);
    api
      .useBooster(player.username, id)
      .then((r) => setPlayer(r.player))
      .catch((e: Error) => toast(e.message, "error"));
  }

  function onTap(p: Pos) {
    if (phase !== "play") return;
    unlockAudio();
    setHint(null);
    if (booster) {
      const frames = booster === "hammer" ? engine.useHammer(p) : engine.useLine(p, booster === "row" ? "h" : "v");
      if (!frames) return;
      consume(booster);
      setBooster(null);
      void perform(frames);
      return;
    }
    if (selected && adjacent(selected, p)) return doSwap(selected, p);
    if (selected && selected.r === p.r && selected.c === p.c) return setSelected(null);
    const t = engine.tileAt(p);
    if (t?.special && engine.isMovable(p)) return void perform(engine.activateAt(p));
    if (engine.isMovable(p)) {
      setSelected(p);
      play("tap");
    }
  }

  function onSwipe(a: Pos, b: Pos) {
    if (phase !== "play" || booster) return;
    unlockAudio();
    setHint(null);
    doSwap(a, b);
  }

  function pickBooster(id: InGameBooster) {
    if (phase !== "play") return;
    unlockAudio();
    play("tap");
    if (booster === id) return setBooster(null);
    if ((player.boosters[id] ?? 0) <= 0) return setBuyAsk(id);
    setSelected(null);
    setHint(null);
    if (id === "shuffle") {
      consume(id);
      void perform(engine.useShuffle());
      return;
    }
    setBooster(id);
  }

  async function buyBooster() {
    if (!buyAsk) return;
    setBuying(true);
    try {
      const r = await api.buy(player.username, buyAsk);
      setPlayer(r.player);
      play("coin");
      toast(`${BOOSTERS[buyAsk].name} cumpărat!`, "success");
      setBuyAsk(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBuying(false);
    }
  }

  async function buyContinue() {
    setBuying(true);
    try {
      const r = await api.continueGame(player.username, continues);
      setPlayer(r.player);
      engine.addMoves(CONTINUE_MOVES);
      setContinues((n) => n + 1);
      setFrame((f) => ({ ...f, movesLeft: engine.movesLeft }));
      play("coin");
      setPhase("play");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBuying(false);
    }
  }

  function giveUp() {
    setPhase("failed");
    void submit(false);
  }

  function quit() {
    setPaused(false);
    const played = engine.movesLeft < cfg.moves || continues > 0;
    if (played && phase !== "done" && phase !== "failed") {
      api.finish(player.username, { level, won: false, score: engine.score, movesLeft: 0, continues }).then(
        (d) => {
          setPlayer(d.player);
          setResult(d.result);
        },
        () => {},
      );
    }
    onExit();
  }

  useEffect(() => {
    if (phase !== "play" || booster || paused) return;
    const t = setTimeout(() => alive.current && setHint(engine.findHint()), level <= 3 ? 3500 : 7000);
    return () => clearTimeout(t);
  }, [phase, frame, selected, booster, paused, engine, level]);

  const theme = worldTheme(worldOf(level));
  const movesLeft = frame.movesLeft;
  const liveStars = computeStars(movesLeft, cfg.baseMoves);
  const lowMoves = movesLeft <= 5 && phase !== "won" && phase !== "done";
  const nextBonus =
    finish?.status === "ok" && finish.data.result.stars === 0 ? assistMoves(finish.data.result.fails) : 0;
  const celebrating = phase === "won" || phase === "done";
  const pillStars = celebrating ? arrived : liveStars;
  const dialogOpen = paused || !!buyAsk || phase === "outOfMoves" || phase === "done" || phase === "failed";
  // star thresholds on the moves bar: where the fill (moves used) passes each star
  const marks = [1, 1 - (0.12 * cfg.baseMoves) / cfg.moves, 1 - (0.3 * cfg.baseMoves) / cfg.moves];

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#5fc3ff]">
      <GemDefs />
      <PieceSources />
      <div className={dialogOpen ? "anim-paused" : undefined}>
      <Scenery theme={theme} />
      <WorldParticles kind={theme.particles} seed={level} />

      <div className="absolute inset-0 flex gap-2 pb-[max(env(safe-area-inset-bottom),6px)] pl-[max(env(safe-area-inset-left),8px)] pr-[max(env(safe-area-inset-right),8px)] pt-[max(env(safe-area-inset-top),6px)]">
        {/* Left: wooden sign with the goals and the moves */}
        <aside className="z-10 flex w-[132px] shrink-0 flex-col gap-1.5">
          <div className="flex h-9 items-center gap-1.5 px-1 leading-tight text-white drop-shadow-[0_2px_0_rgb(0_0_0_/_0.35)]">
            <div className="text-[15px] font-bold">Nivelul {level}</div>
            {cfg.difficulty !== "normal" && (
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${cfg.difficulty === "super" ? "bg-[#7048e8]" : "bg-[#e03131]"}`}>
                {cfg.difficulty === "super" ? "SUPER GREU" : "GREU"}
              </span>
            )}
          </div>

          <div className="wood flex min-h-0 flex-1 flex-col p-2 pb-1.5">
            <div className="wood-inner flex min-h-0 flex-1 flex-col justify-center rounded-[20px_20px_16px_16px]! px-1 py-2">
              <div className={`grid content-center gap-x-5 gap-y-4 ${frame.goals.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {frame.goals.map((g, i) => (
                  <div key={i} ref={(el) => void (goalRefs.current[i] = el)} className="relative mx-auto h-10 w-10">
                    <GoalIcon kind={g.kind} color={g.color} special={g.special} className="h-10 w-10" />
                    {g.remaining > 0 ? (
                      <motion.span
                        key={g.remaining}
                        initial={{ scale: 1.6 }}
                        animate={{ scale: 1 }}
                        className="hud-badge absolute -right-3 -bottom-2 text-[19px] leading-none font-bold"
                      >
                        {g.remaining}
                      </motion.span>
                    ) : (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-2 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#2f9e44]"
                      >
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={4} />
                      </motion.span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className={`flex flex-col items-center pt-1.5 leading-none ${lowMoves ? "low-moves" : ""}`}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8a4a1c]">Mutări</span>
              <motion.span
                key={movesLeft}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className={`hud-num mt-0.5 text-[32px] leading-none font-bold ${lowMoves ? "text-[#d32424]!" : ""}`}
              >
                {movesLeft}
              </motion.span>
            </div>
          </div>

          <div ref={starsRef} className="glass-solid flex items-center justify-between rounded-2xl px-2 py-1 text-white">
            <div className="flex">
              {[1, 2, 3].map((s) => (
                <motion.div key={`${s}-${s <= pillStars}`} initial={{ scale: celebrating ? 1.8 : 1 }} animate={{ scale: 1 }}>
                  <StarShape filled={s <= pillStars} className="h-4 w-4" />
                </motion.div>
              ))}
            </div>
            <span className="text-[13px] font-bold tabular-nums">{formatNumber(frame.score)}</span>
          </div>
        </aside>

        {/* Center: board and the star bar */}
        <main ref={areaRef} className="relative flex min-w-0 flex-1 items-center justify-center">
          <div ref={shakeScope} className="flex flex-col items-center gap-2">
            <Board
              frame={frame}
              S={S}
              sprites={sprites}
              effects={effects}
              selected={selected}
              hint={hint}
              targeting={!!booster}
              boardRef={boardRef}
              onSwipe={onSwipe}
              onTap={onTap}
            />
            <StarBar width={engine.cols * S} used={cfg.moves - movesLeft} total={cfg.moves} marks={marks} lit={liveStars} />
          </div>
          <AnimatePresence>
            {phase === "intro" && (
              <motion.div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -260, scale: 0.4 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                <div className="panel px-6 py-3 text-center">
                  <div className="text-[13px] font-bold uppercase tracking-wider text-ink-soft">Nivelul {level}</div>
                  <div className="mt-1.5 flex justify-center gap-4">
                    {cfg.goals.map((g, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <GoalIcon kind={g.kind} color={g.color} special={g.special} className="h-11 w-11" />
                        <span className="mt-0.5 text-[20px] font-bold">{g.target}</span>
                      </div>
                    ))}
                  </div>
                  {cfg.bonus > 0 && <div className="mt-1 text-[13px] font-bold text-[#2b8a3e]">+{cfg.bonus} mutări bonus pentru perseverență</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {booster && TARGET_TEXT[booster] && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="absolute left-1/2 top-0 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-[#ffd23f] px-3 py-1.5 text-[14px] font-bold whitespace-nowrap text-[#5b3a00] shadow-lg"
              >
                <BoosterIcon id={booster} className="h-7 w-7" />
                <span>{TARGET_TEXT[booster]}</span>
                <button onClick={() => setBooster(null)} className="rounded-full bg-black/10 p-1" aria-label="Anulează">
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right: settings and the wooden tool board */}
        <aside className="z-10 flex w-[86px] shrink-0 flex-col items-center">
          <button
            onClick={() => {
              play("tap");
              setPaused(true);
            }}
            className="puck flex h-10 w-10 shrink-0 items-center justify-center text-white"
            aria-label="Pauză"
          >
            <Settings className="h-6 w-6 drop-shadow-[0_2px_0_rgba(0,40,100,0.45)]" strokeWidth={2.6} />
          </button>
          <div className="flex min-h-0 flex-1 items-center">
            <div className="wood flex flex-col items-center gap-3 px-2 py-3">
              {INGAME_BOOSTERS.map((id) => {
                const n = player.boosters[id] ?? 0;
                const active = booster === id;
                return (
                  <button
                    key={id}
                    onClick={() => pickBooster(id)}
                    disabled={phase !== "play" && !active}
                    className={`relative transition-transform disabled:opacity-60 ${active ? "-translate-x-1.5 scale-110" : ""}`}
                    aria-label={BOOSTERS[id].name}
                  >
                    <div className={`rounded-full ${active ? "ring-4 ring-[#ffd23f]" : ""}`}>
                      <BoosterIcon id={id} className="h-[54px] w-[54px]" />
                    </div>
                    <span
                      className={`absolute -right-1.5 -bottom-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white px-1 text-[13px] font-bold text-white ${
                        n > 0 ? "bg-[#e8352f]" : "bg-[#36b54a]"
                      }`}
                      style={{ boxShadow: "0 2px 0 rgb(0 0 0 / 0.25)" }}
                    >
                      {n > 0 ? n : <Plus className="h-3.5 w-3.5" strokeWidth={4} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-10 shrink-0" />
        </aside>
      </div>
      </div>

      {flash > 0 && <div key={flash} className="hit-flash z-20" />}

      {/* Pieces flying to the goal panel */}
      <div className="pointer-events-none fixed inset-0 z-30">
        {starFlyers.map((f) => (
          <motion.div
            key={f.id}
            className="absolute left-0 top-0 -ml-6 -mt-6 h-12 w-12"
            initial={{ x: f.x0, y: f.y0, scale: 0.4, rotate: -90, opacity: 0 }}
            animate={{
              x: [f.x0, f.x0 + (f.x1 - f.x0) * 0.3, f.x1],
              y: [f.y0, Math.min(f.y0, f.y1) - 90, f.y1],
              scale: [0.4, 1.6, 0.45],
              rotate: [-90, 20, 0],
              opacity: [0, 1, 1],
            }}
            transition={{ duration: 0.62, ease: "easeInOut" }}
          >
            <StarShape filled className="h-full w-full drop-shadow-[0_3px_0_rgb(0_0_0_/_0.35)]" />
          </motion.div>
        ))}
        {flyers.map((f) => (
          <motion.div
            key={f.id}
            className="absolute left-0 top-0"
            style={{ width: f.size, height: f.size, marginLeft: -f.size / 2, marginTop: -f.size / 2 }}
            initial={{ x: f.x0, y: f.y0, scale: 1 }}
            animate={{
              x: [f.x0, f.x0 + (f.x1 - f.x0) * 0.35, f.x1],
              y: [f.y0, Math.min(f.y0, f.y1) - 60, f.y1],
              scale: [1.1, 1.25, 0.55],
              opacity: [1, 1, 0.9],
            }}
            transition={{ duration: 0.62, ease: "easeInOut" }}
          >
            <GoalIcon kind={f.goal.kind} color={f.goal.color} special={f.goal.special} className="h-full w-full" />
          </motion.div>
        ))}
      </div>

      {(phase === "won" || phase === "done") && <Confetti />}

      <PauseModal
        open={paused}
        sound={sound}
        music={music}
        onToggleSound={toggleSound}
        onToggleMusic={toggleMusic}
        onResume={() => setPaused(false)}
        onQuit={quit}
      />
      <BuyBoosterModal id={buyAsk} coins={player.coins} busy={buying} onBuy={buyBooster} onClose={() => setBuyAsk(null)} />
      <OutOfMovesModal
        open={phase === "outOfMoves"}
        goals={frame.goals}
        price={continuePrice(continues)}
        coins={player.coins}
        busy={buying}
        onBuy={buyContinue}
        onGiveUp={giveUp}
      />
      <WinModal
        open={phase === "done"}
        level={level}
        stars={win?.stars ?? 1}
        score={frame.score}
        coins={player.coins}
        finish={finish}
        onNext={() => onExit(level + 1)}
        onMap={() => onExit()}
        onRetrySave={() => void submit(true, win?.movesLeft ?? 0)}
      />
      <FailModal
        open={phase === "failed"}
        level={level}
        saving={finish?.status === "loading"}
        nextBonus={nextBonus}
        onRetry={() => onExit(level)}
        onMap={() => onExit()}
      />
    </div>
  );
}

/**
 * Moves bar with the star thresholds: the fill is the moves used so far, and a star goes out
 * once the fill passes its mark (finish before a mark to keep that star).
 */
function StarBar({ width, used, total, marks, lit }: { width: number; used: number; total: number; marks: number[]; lit: number }) {
  return (
    <div className="star-bar" style={{ width }}>
      <div className="star-bar-fill" style={{ width: `${Math.min(100, Math.max(0, (used / Math.max(1, total)) * 100))}%` }} />
      {marks.map((x, i) => (
        <div key={i} className={`star-bar-mark ${i + 1 <= lit ? "" : "lost"}`} style={{ left: `${Math.max(4, Math.min(100, x * 100))}%` }}>
          <StarShape filled className="h-6 w-6 drop-shadow-[0_2px_0_rgb(0_0_0_/_0.35)]" />
        </div>
      ))}
    </div>
  );
}

const CONFETTI = ["#ff4b5c", "#ffcf26", "#33a3ff", "#4ed351", "#b863ff", "#ff9f43", "#ffffff"];

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {Array.from({ length: 46 }, (_, i) => (
        <span
          key={i}
          className="confetti absolute top-[-20px] block"
          style={{
            left: `${(i * 37) % 100}%`,
            width: 7 + (i % 4) * 2,
            height: 12 + (i % 3) * 3,
            background: CONFETTI[i % CONFETTI.length],
            borderRadius: i % 3 === 0 ? "50%" : 3,
            animationDelay: `${(i % 12) * 0.12}s`,
            animationDuration: `${2.2 + (i % 5) * 0.35}s`,
          }}
        />
      ))}
    </div>
  );
}
