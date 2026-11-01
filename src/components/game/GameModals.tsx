"use client";

import { motion } from "motion/react";
import { Gauge, HelpCircle, Loader2, LogOut, Map as MapIcon, Music, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BOOSTERS, type BoosterId } from "@/lib/game/economy";
import type { Goal } from "@/lib/game/types";
import type { FinishResponse } from "@/lib/shared";
import { play } from "@/lib/sound";
import { Coin, GoalIcon, StarShape } from "../art/Pieces";
import { Avatar, BoosterIcon, formatNumber, Modal } from "../ui";
import { HowToPlay } from "./HowToPlay";

export type FinishState = { status: "loading" } | { status: "ok"; data: FinishResponse } | { status: "error"; error: string };

function CountUp({ value, from = 0, duration = 900, delay = 0 }: { value: number; from?: number; duration?: number; delay?: number }) {
  const [shown, setShown] = useState(from);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / duration));
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, from, duration, delay]);
  return <>{formatNumber(shown)}</>;
}

interface CoinFlight {
  id: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Coins jump from the reward line into the purse; the purse counts up as they land. */
function CoinRain({ from, to, total }: { from: React.RefObject<HTMLElement | null>; to: React.RefObject<HTMLElement | null>; total: number }) {
  const [coins, setCoins] = useState<CoinFlight[]>([]);
  useEffect(() => {
    const a = from.current?.getBoundingClientRect();
    const b = to.current?.getBoundingClientRect();
    if (!a || !b) return;
    const n = Math.min(10, 4 + Math.ceil(total / 25));
    const list = Array.from({ length: n }, (_, i) => ({
      id: i,
      x0: a.left + a.width / 2 + (i % 3) * 8,
      y0: a.top + a.height / 2,
      x1: b.left + b.width / 2,
      y1: b.top + b.height / 2,
    }));
    const t = setTimeout(() => setCoins(list), 250);
    const done = setTimeout(() => setCoins([]), 250 + n * 70 + 700);
    return () => {
      clearTimeout(t);
      clearTimeout(done);
    };
  }, [from, to, total]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {coins.map((c, i) => (
        <motion.div
          key={c.id}
          className="absolute left-0 top-0 -ml-3.5 -mt-3.5 h-7 w-7"
          initial={{ x: c.x0, y: c.y0, scale: 0.6, opacity: 0 }}
          animate={{
            x: [c.x0, c.x0 + (c.x1 - c.x0) * 0.4, c.x1],
            y: [c.y0, Math.min(c.y0, c.y1) - 50 - (i % 4) * 10, c.y1],
            scale: [0.6, 1.2, 0.7],
            opacity: [0, 1, 1],
          }}
          transition={{ duration: 0.55, delay: i * 0.07, ease: "easeInOut" }}
          onAnimationComplete={() => i % 3 === 0 && play("coin")}
        >
          <Coin className="h-full w-full" />
        </motion.div>
      ))}
    </div>
  );
}

export function WinModal({
  open,
  level,
  stars,
  score,
  coins,
  finish,
  onNext,
  onMap,
  onRetrySave,
}: {
  open: boolean;
  level: number;
  stars: number;
  score: number;
  /** the player's coins after the reward was added */
  coins: number;
  finish: FinishState | null;
  onNext: () => void;
  onMap: () => void;
  onRetrySave: () => void;
}) {
  const rewardRef = useRef<HTMLSpanElement>(null);
  const purseRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const timers = [0, 1, 2].filter((i) => i < stars).map((i) => setTimeout(() => play("star"), 450 + i * 380));
    return () => timers.forEach(clearTimeout);
  }, [open, stars]);

  const data = finish?.status === "ok" ? finish.data : null;
  const rewardTotal = data?.reward?.total ?? 0;
  const flightMs = 250 + Math.min(10, 4 + Math.ceil(rewardTotal / 25)) * 70;
  return (
    <Modal open={open} title={`Nivelul ${level} complet!`} wide>
      {open && rewardTotal > 0 && <CoinRain from={rewardRef} to={purseRef} total={rewardTotal} />}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <div className="flex items-end justify-center gap-1 pb-1 pt-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.45 + i * 0.38, type: "spring", stiffness: 380, damping: 14 }}
                className={i === 1 ? "-translate-y-3" : ""}
              >
                <StarShape filled={i < stars} className={i === 1 ? "h-20 w-20" : "h-16 w-16"} />
              </motion.div>
            ))}
          </div>
          <div className="text-center">
            <div className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Scor</div>
            <div className="text-[34px] leading-none font-bold text-[#7a3fe0]">
              <CountUp value={score} />
            </div>
            {data?.newBest && data.result.score > 0 && (
              <div className="mt-1.5 inline-block rounded-full bg-[#ffd23f] px-3 py-0.5 text-[12px] font-bold text-[#7a4a00]">Record personal nou!</div>
            )}
          </div>
          <div className="flex-1" />
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2.5">
            <button onClick={onMap} className="btn btn-purple h-13 w-13" aria-label="Hartă">
              <MapIcon className="h-6 w-6" />
            </button>
            <button onClick={onNext} disabled={finish?.status !== "ok"} className="btn btn-green h-13 text-[18px]">
              Nivelul următor <Play className="h-5 w-5 fill-white" />
            </button>
          </div>
        </div>

        <div className="min-w-0">
          <div ref={purseRef} className="mb-2 flex items-center justify-end gap-1.5 text-[15px] font-bold text-ink-soft">
            <Coin className="h-6 w-6" />
            <span className="tabular-nums text-ink">
              {rewardTotal > 0 ? <CountUp from={coins - rewardTotal} value={coins} duration={700} delay={flightMs} /> : formatNumber(coins)}
            </span>
          </div>
          <div className="panel-inset p-3">
            {!finish || finish.status === "loading" ? (
              <div className="flex items-center justify-center gap-2 py-2 text-ink-soft">
                <Loader2 className="h-5 w-5 animate-spin" /> Se salvează progresul…
              </div>
            ) : finish.status === "error" ? (
              <div className="text-center">
                <p className="text-[14px] font-medium text-[#c92a2a]">{finish.error}</p>
                <button onClick={onRetrySave} className="btn btn-gold mt-2 h-10 px-5 text-[15px]">
                  <RotateCcw className="h-4 w-4" /> Reîncearcă salvarea
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold">Recompensă</span>
                  <span ref={rewardRef} className="flex items-center gap-1.5 text-[22px] font-bold text-[#b86a0a]">
                    +<CountUp value={rewardTotal} duration={900} />
                    <Coin className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {data!.reward?.parts.map((p) => (
                    <div key={p.label} className="flex justify-between text-[13px] text-ink-soft">
                      <span>{p.label}</span>
                      <span>+{p.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {data && data.ranking.length > 0 && (
            <div className="mt-2.5">
              <div className="mb-1 text-[13px] font-bold uppercase tracking-wide text-ink-soft">Clasament pe nivel</div>
              <div className="space-y-1">
                {data.ranking.slice(0, 4).map((r, i) => (
                  <div key={r.username} className={`flex items-center gap-2 rounded-xl px-2 py-1 ${r.isMe ? "bg-[#ffe9a8]" : "bg-white/60"}`}>
                    <span className="w-4 text-center text-[13px] font-bold text-ink-soft">{i + 1}</span>
                    <Avatar emoji={r.avatar} className="h-7 w-7 text-base" ring="ring-white" />
                    <span className="flex-1 truncate text-[14px] font-semibold">{r.isMe ? "Tu" : r.username}</span>
                    <span className="flex">
                      {[0, 1, 2].map((s) => (
                        <StarShape key={s} filled={s < r.stars} className="h-3.5 w-3.5" />
                      ))}
                    </span>
                    <span className="w-14 text-right text-[13px] font-bold">{formatNumber(r.score)}</span>
                  </div>
                ))}
              </div>
              {data.ranking.length === 1 && (
                <p className="mt-1 text-center text-[12px] text-ink-soft">Adaugă prieteni ca să vă comparați scorurile!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function OutOfMovesModal({
  open,
  goals,
  price,
  coins,
  busy,
  onBuy,
  onGiveUp,
}: {
  open: boolean;
  goals: Goal[];
  price: number;
  coins: number;
  busy: boolean;
  onBuy: () => void;
  onGiveUp: () => void;
}) {
  return (
    <Modal open={open} title="Fără mutări!">
      <p className="text-center text-[15px] font-medium text-ink-soft">Mai ai atât de puțin până la final:</p>
      <div className="mt-3 flex justify-center gap-3">
        {goals
          .filter((g) => g.remaining > 0)
          .map((g, i) => (
            <div key={i} className="panel-inset flex flex-col items-center px-3 py-2">
              <GoalIcon kind={g.kind} color={g.color} className="h-10 w-10" />
              <span className="mt-1 text-[18px] font-bold">{g.remaining}</span>
            </div>
          ))}
      </div>
      <button onClick={onBuy} disabled={busy || coins < price} className="btn btn-green mt-5 h-14 w-full text-[19px]">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>+5 mutări</>}
        <span className="ml-1 flex items-center gap-1 rounded-full bg-black/15 px-2.5 py-0.5 text-[16px]">
          {price} <Coin className="h-5 w-5" />
        </span>
      </button>
      {coins < price && <p className="mt-2 text-center text-[13px] text-[#c92a2a]">Nu ai destule monede ({coins}).</p>}
      <button onClick={onGiveUp} disabled={busy} className="mt-3 w-full py-2 text-[15px] font-semibold text-ink-soft underline-offset-4 active:underline">
        Renunț la nivel
      </button>
    </Modal>
  );
}

export function FailModal({
  open,
  level,
  saving,
  nextBonus,
  onRetry,
  onMap,
}: {
  open: boolean;
  level: number;
  saving: boolean;
  nextBonus: number;
  onRetry: () => void;
  onMap: () => void;
}) {
  return (
    <Modal open={open} title={`Nivelul ${level}`}>
      <div className="py-2 text-center">
        <div className="text-[54px] leading-none">💔</div>
        <p className="mt-2 text-[19px] font-bold">Nu a mers de data asta</p>
        <p className="mt-1 text-[14px] text-ink-soft">Fiecare încercare te face mai bun. Hai încă o dată!</p>
        {nextBonus > 0 && (
          <p className="mx-auto mt-3 w-fit rounded-full bg-[#d3f9d8] px-3 py-1 text-[13px] font-bold text-[#2b8a3e]">
            Data viitoare primești +{nextBonus} mutări bonus
          </p>
        )}
      </div>
      <div className="mt-3 grid grid-cols-[auto_1fr] gap-2.5">
        <button onClick={onMap} disabled={saving} className="btn btn-purple h-13 w-13" aria-label="Hartă">
          <MapIcon className="h-6 w-6" />
        </button>
        <button onClick={onRetry} disabled={saving} className="btn btn-green h-13 text-[19px]">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />} Încearcă din nou
        </button>
      </div>
    </Modal>
  );
}

export function PauseModal({
  open,
  sound,
  music,
  lite,
  onToggleSound,
  onToggleMusic,
  onToggleLite,
  onResume,
  onQuit,
}: {
  open: boolean;
  sound: boolean;
  music: boolean;
  lite: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onToggleLite: () => void;
  onResume: () => void;
  onQuit: () => void;
}) {
  const [help, setHelp] = useState(false);
  return (
    <Modal open={open} onClose={onResume} title={help ? "Cum se joacă" : "Pauză"}>
      {help ? (
        <>
          <HowToPlay />
          <button onClick={() => setHelp(false)} className="btn btn-purple mt-4 h-12 w-full text-[17px]">
            Înapoi
          </button>
        </>
      ) : (
        <div className="space-y-3 pt-1">
          <button onClick={onResume} className="btn btn-green h-14 w-full text-[20px]">
            <Play className="h-5 w-5 fill-white" /> Continuă
          </button>
          <div className="grid grid-cols-3 gap-2.5">
            <button onClick={onToggleSound} className={`btn h-12 text-[15px] ${sound ? "btn-blue" : "btn-purple"}`}>
              {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />} {sound ? "Sunet" : "Mut"}
            </button>
            <button onClick={onToggleMusic} className={`btn h-12 text-[15px] ${music ? "btn-blue" : "btn-purple"}`}>
              <Music className="h-5 w-5" /> {music ? "Muzică" : "Fără"}
            </button>
            <button onClick={() => setHelp(true)} className="btn btn-gold h-12 text-[15px]">
              <HelpCircle className="h-5 w-5" /> Ajutor
            </button>
          </div>
          <button onClick={onToggleLite} className={`btn h-11 w-full text-[15px] ${lite ? "btn-purple" : "btn-blue"}`}>
            <Gauge className="h-5 w-5" /> {lite ? "Grafică redusă (pentru telefoane lente)" : "Grafică completă"}
          </button>
          <button onClick={onQuit} className="btn btn-red h-12 w-full text-[16px]">
            <LogOut className="h-5 w-5" /> Ieși din nivel
          </button>
        </div>
      )}
    </Modal>
  );
}

export function BuyBoosterModal({
  id,
  coins,
  busy,
  onBuy,
  onClose,
}: {
  id: BoosterId | null;
  coins: number;
  busy: boolean;
  onBuy: () => void;
  onClose: () => void;
}) {
  const info = id ? BOOSTERS[id] : null;
  return (
    <Modal open={!!id} onClose={onClose} title={info?.name}>
      {id && info && (
        <div className="flex flex-col items-center pt-1 text-center">
          <BoosterIcon id={id} className="h-24 w-24" />
          <p className="mt-3 text-[15px] font-medium">{info.desc}</p>
          <button onClick={onBuy} disabled={busy || coins < info.price} className="btn btn-green mt-4 h-13 w-full text-[18px]">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Cumpără"}
            <span className="ml-1 flex items-center gap-1 rounded-full bg-black/15 px-2.5 py-0.5 text-[16px]">
              {info.price} <Coin className="h-5 w-5" />
            </span>
          </button>
          <p className="mt-2 text-[13px] text-ink-soft">
            Ai {formatNumber(coins)} <Coin className="inline h-4 w-4 align-[-3px]" />
          </p>
        </div>
      )}
    </Modal>
  );
}
