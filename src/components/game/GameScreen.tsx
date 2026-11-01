"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Check, Pause, Plus, X } from "lucide-react";
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
import { useGame } from "@/lib/store";
import { worldOf, worldTheme } from "@/lib/worlds";
import { GemDefs, GoalIcon, StarShape } from "../art/Pieces";
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const adjacent = (a: Pos, b: Pos) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

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
  const toggleSound = useGame((s) => s.toggleSound);
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
  const areaRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
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
      setS(Math.max(22, Math.floor(Math.min((width - 16) / engine.cols, (height - 14) / engine.rows, 64))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [engine]);

  useEffect(() => {
    const t = setTimeout(() => alive.current && setPhase("play"), 1900);
    return () => clearTimeout(t);
  }, []);

  const addEffects = useCallback((fx: Effect[]) => {
    if (!fx.length) return;
    setEffects((prev) => [...prev, ...fx]);
    const ids = new Set(fx.map((f) => f.id));
    setTimeout(() => alive.current && setEffects((prev) => prev.filter((e) => !ids.has(e.id))), 1250);
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
      await wait(f.duration / speed);
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
    await wait(1500);
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

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#5fc3ff]">
      <Scenery theme={theme} />
      <GemDefs />

      <div className="absolute inset-0 flex gap-2 pb-[max(env(safe-area-inset-bottom),6px)] pl-[max(env(safe-area-inset-left),8px)] pr-[max(env(safe-area-inset-right),8px)] pt-[max(env(safe-area-inset-top),6px)]">
        {/* Left: goals and moves */}
        <aside className="z-10 flex w-[128px] shrink-0 flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                play("tap");
                setPaused(true);
              }}
              className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white active:scale-95"
              aria-label="Pauză"
            >
              <Pause className="h-5 w-5 fill-white" />
            </button>
            <div className="min-w-0 leading-tight text-white drop-shadow-[0_2px_0_rgb(0_0_0_/_0.35)]">
              <div className="text-[15px] font-bold">Nivelul {level}</div>
              {cfg.difficulty !== "normal" && (
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${cfg.difficulty === "super" ? "bg-[#7048e8]" : "bg-[#e03131]"}`}>
                  {cfg.difficulty === "super" ? "SUPER GREU" : "GREU"}
                </span>
              )}
            </div>
          </div>

          <div className="panel flex min-h-0 flex-1 flex-col rounded-[20px]! px-1.5 py-1.5">
            <div className="text-center text-[11px] font-bold uppercase tracking-wide text-ink-soft">Obiective</div>
            <div className={`grid flex-1 content-center gap-x-1 gap-y-1.5 ${frame.goals.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {frame.goals.map((g, i) => (
                <div key={i} ref={(el) => void (goalRefs.current[i] = el)} className="relative flex flex-col items-center">
                  <GoalIcon kind={g.kind} color={g.color} special={g.special} className="h-9 w-9" />
                  {g.remaining > 0 ? (
                    <motion.span key={g.remaining} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="text-[16px] leading-tight font-bold">
                      {g.remaining}
                    </motion.span>
                  ) : (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#2f9e44]"
                    >
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={4} />
                    </motion.span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={`panel flex flex-col items-center rounded-[20px]! py-1 ${lowMoves ? "animate-pulse" : ""}`}>
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Mutări</span>
            <motion.span
              key={movesLeft}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              className={`text-[30px] leading-none font-bold ${lowMoves ? "text-[#e03131]" : "text-ink"}`}
            >
              {movesLeft}
            </motion.span>
          </div>

          <div className="glass flex items-center justify-between rounded-2xl px-2 py-1 text-white">
            <div className="flex">
              {[1, 2, 3].map((s) => (
                <StarShape key={s} filled={s <= (win?.stars ?? liveStars)} className="h-4 w-4" />
              ))}
            </div>
            <span className="text-[13px] font-bold tabular-nums">{formatNumber(frame.score)}</span>
          </div>
        </aside>

        {/* Center: board */}
        <main ref={areaRef} className="relative flex min-w-0 flex-1 items-center justify-center">
          <div ref={shakeScope}>
            <Board
              frame={frame}
              S={S}
              effects={effects}
              selected={selected}
              hint={hint}
              targeting={!!booster}
              boardRef={boardRef}
              onSwipe={onSwipe}
              onTap={onTap}
            />
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

        {/* Right: boosters */}
        <aside className="z-10 flex w-[74px] shrink-0 flex-col justify-center">
          <div className="glass flex flex-col items-center gap-3 rounded-[26px] px-1.5 py-3">
            {INGAME_BOOSTERS.map((id) => {
              const n = player.boosters[id] ?? 0;
              const active = booster === id;
              return (
                <button
                  key={id}
                  onClick={() => pickBooster(id)}
                  disabled={phase !== "play" && !active}
                  className={`relative transition-transform active:scale-90 disabled:opacity-60 ${active ? "-translate-x-1.5 scale-110" : ""}`}
                  aria-label={BOOSTERS[id].name}
                >
                  <div className={`rounded-full ${active ? "ring-4 ring-[#ffd23f]" : ""}`}>
                    <BoosterIcon id={id} className="h-[52px] w-[52px]" />
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white px-1 text-[12px] font-bold text-white ${
                      n > 0 ? "bg-[#2f9e44]" : "bg-[#f08c00]"
                    }`}
                  >
                    {n > 0 ? n : <Plus className="h-3.5 w-3.5" strokeWidth={4} />}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Pieces flying to the goal panel */}
      <div className="pointer-events-none fixed inset-0 z-30">
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

      <PauseModal open={paused} sound={sound} onToggleSound={toggleSound} onResume={() => setPaused(false)} onQuit={quit} />
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
