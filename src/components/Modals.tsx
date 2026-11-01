"use client";

import { motion } from "motion/react";
import { Check, Gift, HelpCircle, Loader2, LogOut, Music, Play, UserMinus, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { BOOSTERS, DAILY_REWARDS, PRE_BOOSTERS, type PreBooster } from "@/lib/game/economy";
import { generateLevel } from "@/lib/game/levels";
import { AVATARS, assistMoves, type FriendDTO, type LevelScoreRow } from "@/lib/shared";
import { play } from "@/lib/sound";
import { useGame } from "@/lib/store";
import type { GoalKind, LevelConfig } from "@/lib/game/types";
import { AvatarArt } from "./art/Avatars";
import { Coin, GoalIcon, StarShape } from "./art/Pieces";
import { HowToPlay } from "./game/HowToPlay";
import { InstallButton } from "./OrientationGate";
import { Avatar, BoosterIcon, formatNumber, Modal, timeAgo } from "./ui";

const INTRO: Record<string, { title: string; text: string }> = {
  crate: { title: "Nou: Cutii de lemn", text: "Se sparg când faci potriviri lângă ele sau când le lovește o explozie. Cele întărite au mai multe straturi." },
  ice: { title: "Nou: Gheață", text: "Se topește când potrivești piesa de deasupra ei. Gheața groasă are nevoie de două lovituri." },
  cloud: { title: "Nou: Nori de vată", text: "Dispar din potriviri alăturate sau din explozii. Rachetele și bombele îi risipesc rapid!" },
  lock: { title: "Nou: Lanțuri", text: "Piesa legată nu se mișcă și ține pe loc tot ce e deasupra. O potrivire sau o explozie rupe lanțul." },
  grass: { title: "Nou: Iarbă", text: "Potrivirile care ating iarba o întind pe toate piesele potrivite. Acoperă toată tabla!" },
  special: { title: "Nou: Obiective speciale", text: "Creează piesele cerute: 4 în linie = rachetă, L sau T = bombă, pătrat = avion, 5 în linie = glob." },
};

const PREVIEW: Record<string, string> = {
  crate: "#e8a85a",
  cloud: "#ffb3da",
  ice: "#bfe6ff",
  lock: "#8d96b3",
  grass: "#5ad04a",
};

/** Tiny map of the level: where the holes, crates, ice, chains and grass are. */
function BoardPreview({ cfg }: { cfg: LevelConfig }) {
  const rows = cfg.mask.length;
  const cols = cfg.mask[0].length;
  const key = (r: number, c: number) => `${r},${c}`;
  const marks = new Map<string, string>();
  for (const p of cfg.grass) marks.set(key(p.r, p.c), PREVIEW.grass);
  for (const p of cfg.locks) marks.set(key(p.r, p.c), PREVIEW.lock);
  for (const i of cfg.ice) marks.set(key(i.r, i.c), PREVIEW.ice);
  for (const b of cfg.blockers) marks.set(key(b.r, b.c), PREVIEW[b.kind]);
  const cell = Math.min(9, Math.floor(150 / cols));
  return (
    <div className="mx-auto mt-2 rounded-lg p-1" style={{ background: "#9fa9dc", width: "fit-content" }}>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: 1 }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const exists = cfg.mask[r][c];
          return <span key={i} className="rounded-[2px]" style={{ width: cell, height: cell, background: exists ? (marks.get(key(r, c)) ?? "#c6cdf1") : "transparent" }} />;
        })}
      </div>
    </div>
  );
}

export function LevelStartModal({
  level,
  onClose,
  onPlay,
}: {
  level: number | null;
  onClose: () => void;
  onPlay: (level: number, pre: PreBooster[]) => void;
}) {
  return (
    <Modal open={level !== null} onClose={onClose} title={level !== null ? `Nivelul ${level}` : ""} wide>
      {level !== null && <LevelStartBody key={level} level={level} onPlay={onPlay} />}
    </Modal>
  );
}

function LevelStartBody({ level, onPlay }: { level: number; onPlay: (level: number, pre: PreBooster[]) => void }) {
  const player = useGame((s) => s.player)!;
  const result = useGame((s) => s.results[level]);
  const setPlayer = useGame((s) => s.setPlayer);
  const toast = useGame((s) => s.toast);
  const cfg = useMemo(() => generateLevel(level), [level]);
  const [chosen, setChosen] = useState<PreBooster[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [ranking, setRanking] = useState<LevelScoreRow[] | null>(null);
  const bonus = (result?.stars ?? 0) > 0 ? 0 : assistMoves(result?.fails ?? 0);
  const intro = cfg.intro ? INTRO[cfg.intro] : null;

  useEffect(() => {
    let live = true;
    api
      .levelRanking(player.username, level)
      .then((r) => live && setRanking(r.ranking))
      .catch(() => live && setRanking([]));
    return () => {
      live = false;
    };
  }, [level, player.username]);

  async function toggle(id: PreBooster) {
    play("tap");
    if (chosen.includes(id)) return setChosen(chosen.filter((x) => x !== id));
    if ((player.boosters[id] ?? 0) > 0) return setChosen([...chosen, id]);
    setBusy(id);
    try {
      const r = await api.buy(player.username, id);
      setPlayer(r.player);
      play("coin");
      setChosen([...chosen, id]);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function start() {
    setBusy("play");
    try {
      if (chosen.length) {
        const r = await api.start(player.username, level, chosen);
        setPlayer(r.player);
      }
      onPlay(level, chosen);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="min-w-0">
        <div className="flex items-center justify-center gap-2">
          {cfg.difficulty !== "normal" && (
            <span className={`rounded-full px-3 py-0.5 text-[13px] font-bold text-white ${cfg.difficulty === "super" ? "bg-[#7048e8]" : "bg-[#e03131]"}`}>
              {cfg.difficulty === "super" ? "Nivel super greu" : "Nivel greu"}
            </span>
          )}
          {result && result.stars > 0 && (
            <span className="flex">
              {[1, 2, 3].map((s) => (
                <StarShape key={s} filled={s <= result.stars} className="h-6 w-6" />
              ))}
            </span>
          )}
        </div>
        <div className="mt-1 text-center text-[13px] font-bold uppercase tracking-wide text-ink-soft">Obiective</div>
        <div className="mt-1.5 flex flex-wrap justify-center gap-2">
          {cfg.goals.map((g, i) => (
            <div key={i} className="panel-inset flex min-w-[58px] flex-col items-center px-2 py-1.5">
              <GoalIcon kind={g.kind} color={g.color} special={g.special} className="h-9 w-9" />
              <span className="mt-0.5 text-[18px] font-bold">{g.target}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[15px] font-semibold">
          în <span className="text-[#7a3fe0]">{cfg.moves + bonus}</span> mutări
          {bonus > 0 && <span className="ml-1 text-[13px] font-bold text-[#2b8a3e]">(+{bonus} bonus)</span>}
        </p>
        <BoardPreview cfg={cfg} />
        {intro && (
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-[#e7f5ff] p-2.5">
            <GoalIcon kind={cfg.intro === "special" ? "special" : (cfg.intro as GoalKind)} special="bomb" className="h-11 w-11 shrink-0" />
            <div className="leading-snug">
              <div className="text-[14px] font-bold text-[#1864ab]">{intro.title}</div>
              <div className="text-[12.5px] font-medium">{intro.text}</div>
            </div>
          </div>
        )}
        {level === 1 && (
          <div className="mt-2">
            <HowToPlay />
          </div>
        )}
      </div>

      <div className="sticky top-0 flex min-w-0 flex-col self-start">
        {ranking && ranking.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 text-[13px] font-bold uppercase tracking-wide text-ink-soft">Cei mai buni prieteni aici</div>
            <div className="space-y-1">
              {ranking.slice(0, 3).map((r, i) => (
                <div key={r.username} className={`flex items-center gap-2 rounded-xl px-2 py-1 ${r.isMe ? "bg-[#ffe9a8]" : "bg-white/60"}`}>
                  <span className="w-4 text-[13px] font-bold text-ink-soft">{i + 1}</span>
                  <Avatar emoji={r.avatar} className="h-7 w-7 text-base" />
                  <span className="flex-1 truncate text-[14px] font-semibold">{r.isMe ? "Tu" : r.username}</span>
                  <span className="text-[14px] font-bold">{formatNumber(r.score)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">Ajutoare la start</div>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {PRE_BOOSTERS.map((id) => {
            const n = player.boosters[id] ?? 0;
            const on = chosen.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                disabled={busy !== null}
                className={`relative flex flex-col items-center rounded-2xl border-[3px] px-1 pb-1.5 pt-2 transition ${
                  on ? "border-[#2f9e44] bg-[#ebfbee]" : "border-[#f1d7a5] bg-white/70"
                }`}
              >
                <BoosterIcon id={id} className="h-11 w-11" />
                <span className="mt-1 text-[11px] leading-tight font-bold">{BOOSTERS[id].name}</span>
                {on ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#2f9e44] ring-2 ring-white">
                    <Check className="h-4 w-4 text-white" strokeWidth={4} />
                  </span>
                ) : n > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#5b2fd0] px-1 text-[12px] font-bold text-white ring-2 ring-white">
                    {n}
                  </span>
                ) : (
                  <span className="absolute -right-1.5 -top-1.5 flex items-center gap-0.5 rounded-full bg-[#f08c00] px-1.5 py-0.5 text-[11px] font-bold text-white ring-2 ring-white">
                    {busy === id ? <Loader2 className="h-3 w-3 animate-spin" /> : BOOSTERS[id].price}
                    <Coin className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={start} disabled={busy !== null} className="btn btn-green shine mt-4 h-14 w-full text-[22px]">
          {busy === "play" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6 fill-white" />} Joacă!
        </button>
      </div>
    </div>
  );
}

export function DailyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const player = useGame((s) => s.player)!;
  const setPlayer = useGame((s) => s.setPlayer);
  const toast = useGame((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState<number | null>(null);
  const day = ((player.dailyNext - 1) % DAILY_REWARDS.length) + 1;

  async function claim() {
    setBusy(true);
    try {
      const r = await api.daily(player.username);
      setClaimed(r.reward);
      play("coin");
      setTimeout(() => play("win"), 200);
      setPlayer(r.player);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setClaimed(null);
        onClose();
      }}
      title="Cadoul zilnic"
    >
      <p className="text-center text-[14px] font-medium text-ink-soft">Intră în fiecare zi: cadoul crește cu fiecare zi la rând!</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {DAILY_REWARDS.map((coins, i) => {
          const d = i + 1;
          const past = player.dailyAvailable ? d < day : d <= day;
          const today = d === day;
          return (
            <div
              key={d}
              className={`relative flex flex-col items-center rounded-2xl border-[3px] py-2 ${i === 6 ? "col-span-2" : ""} ${
                today ? "border-[#f59f1a] bg-[#fff3bf]" : past ? "border-[#b2f2bb] bg-[#ebfbee]" : "border-[#f1d7a5] bg-white/70"
              }`}
            >
              <span className="text-[11px] font-bold uppercase text-ink-soft">Ziua {d}</span>
              {i === 6 ? <Gift className="my-0.5 h-8 w-8 text-[#d6336c]" /> : <Coin className="my-0.5 h-8 w-8" />}
              <span className="text-[15px] font-bold">{coins}</span>
              {past && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#2f9e44] ring-2 ring-white">
                  <Check className="h-3 w-3 text-white" strokeWidth={4} />
                </span>
              )}
            </div>
          );
        })}
      </div>
      {claimed !== null ? (
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 text-[30px] font-bold text-[#b86a0a]">
            +{claimed} <Coin className="h-9 w-9" />
          </div>
          <p className="text-[14px] font-semibold text-ink-soft">Ne vedem mâine!</p>
        </motion.div>
      ) : (
        <button onClick={claim} disabled={busy || !player.dailyAvailable} className="btn btn-green shine mt-4 h-14 w-full text-[20px]">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Gift className="h-6 w-6" />}
          {player.dailyAvailable ? "Ia cadoul" : "Revino mâine"}
        </button>
      )}
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel-inset px-2 py-2 text-center">
      <div className="text-[20px] leading-tight font-bold">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</div>
    </div>
  );
}

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const player = useGame((s) => s.player)!;
  const sound = useGame((s) => s.sound);
  const music = useGame((s) => s.music);
  const toggleSound = useGame((s) => s.toggleSound);
  const toggleMusic = useGame((s) => s.toggleMusic);
  const setPlayer = useGame((s) => s.setPlayer);
  const logout = useGame((s) => s.logout);
  const toast = useGame((s) => s.toast);
  const [help, setHelp] = useState(false);

  async function changeAvatar(a: string) {
    if (a === player.avatar) return;
    play("tap");
    const prev = player;
    setPlayer({ ...player, avatar: a });
    try {
      const r = await api.setAvatar(player.username, a);
      setPlayer(r.player);
    } catch (e) {
      setPlayer(prev);
      toast((e as Error).message, "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setHelp(false);
        onClose();
      }}
      title={help ? "Cum se joacă" : "Profilul meu"}
      wide
    >
      {help ? (
        <>
          <HowToPlay />
          <button onClick={() => setHelp(false)} className="btn btn-purple mt-4 h-12 w-full text-[17px]">
            Înapoi
          </button>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex flex-col items-center">
              <Avatar emoji={player.avatar} className="h-20 w-20 text-[46px]" />
              <div className="mt-2 text-[24px] font-bold">{player.username}</div>
              <div className="text-[13px] text-ink-soft">Jucător din {new Date(player.createdAt).toLocaleDateString("ro-RO")}</div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Nivel" value={player.level} />
              <Stat label="Stele" value={formatNumber(player.totalStars)} />
              <Stat label="Câștigate" value={player.gamesWon} />
            </div>
            <div className="mt-2">
              <Stat label="Scor total" value={formatNumber(player.totalScore)} />
            </div>
          </div>
          <div>
            <div className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">Avatar</div>
            <div className="mt-1.5 grid grid-cols-8 gap-1.5">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => changeAvatar(a)}
                  className={`flex aspect-square items-center justify-center rounded-xl p-0.5 ${
                    player.avatar === a ? "bg-[#ffd23f] shadow-[0_3px_0_#c98a2b]" : "bg-white/70"
                  }`}
                  aria-label="Avatar"
                >
                  <AvatarArt emoji={a} className="h-full w-full" />
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={toggleSound} className={`btn h-12 text-[15px] ${sound ? "btn-blue" : "btn-purple"}`}>
                {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />} {sound ? "Sunet" : "Mut"}
              </button>
              <button onClick={toggleMusic} className={`btn h-12 text-[15px] ${music ? "btn-blue" : "btn-purple"}`}>
                <Music className="h-5 w-5" /> {music ? "Muzică" : "Fără"}
              </button>
              <button onClick={() => setHelp(true)} className="btn btn-gold h-12 text-[15px]">
                <HelpCircle className="h-5 w-5" /> Ajutor
              </button>
            </div>
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="btn btn-red mt-3 h-12 w-full text-[16px]"
            >
              <LogOut className="h-5 w-5" /> Schimbă jucătorul
            </button>
            <InstallButton className="mt-3 h-12 w-full text-[16px]" label="Instalează pe ecranul principal" />
          </div>
        </div>
      )}
    </Modal>
  );
}

export function FriendModal({ friend, onClose }: { friend: FriendDTO | null; onClose: () => void }) {
  const player = useGame((s) => s.player)!;
  const setFriends = useGame((s) => s.setFriends);
  const toast = useGame((s) => s.toast);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!friend) return;
    setBusy(true);
    try {
      const r = await api.removeFriend(player.username, friend.username);
      setFriends(r.friends);
      toast(`${friend.username} a fost scos din prieteni`);
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  const diff = friend ? friend.level - player.level : 0;
  return (
    <Modal
      open={!!friend}
      onClose={() => {
        setConfirm(false);
        onClose();
      }}
      title={friend?.username}
    >
      {friend && (
        <>
          <div className="flex flex-col items-center">
            <Avatar emoji={friend.avatar} className="h-20 w-20 text-[46px]" ring="ring-[#4cb4ff]" />
            <div className="mt-1.5 text-[13px] font-semibold text-ink-soft">{timeAgo(friend.lastSeen)}</div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Nivel" value={friend.level} />
            <Stat label="Stele" value={formatNumber(friend.totalStars)} />
            <Stat label="Scor" value={formatNumber(friend.totalScore)} />
          </div>
          <div className="panel-inset mt-3 p-3 text-center text-[15px] font-semibold">
            {diff > 0
              ? `${friend.username} e cu ${diff} ${diff === 1 ? "nivel" : "nivele"} înaintea ta. Prinde-l din urmă!`
              : diff < 0
                ? `Ești cu ${-diff} ${diff === -1 ? "nivel" : "nivele"} înaintea lui ${friend.username}. Bravo!`
                : "Sunteți la același nivel. Cine trece primul?"}
          </div>
          {confirm ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button onClick={() => setConfirm(false)} className="btn btn-purple h-12 text-[16px]">
                Anulează
              </button>
              <button onClick={remove} disabled={busy} className="btn btn-red h-12 text-[16px]">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Da, șterge"}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)} className="mt-4 flex w-full items-center justify-center gap-1.5 py-2 text-[14px] font-semibold text-[#c92a2a]">
              <UserMinus className="h-4 w-4" /> Scoate din prieteni
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
