"use client";

import { create } from "zustand";
import type { InGameBooster } from "./game/economy";
import type { FriendDTO, LevelResultDTO, PlayerDTO } from "./shared";

export const USERNAME_KEY = "djesi.username";
const SOUND_KEY = "djesi.sound";
const MUSIC_KEY = "djesi.music";
const GFX_KEY = "djesi.gfx";

export type Gfx = "auto" | "high" | "low";

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "success" | "error";
}

interface State {
  player: PlayerDTO | null;
  results: Record<number, LevelResultDTO>;
  friends: FriendDTO[];
  sound: boolean;
  music: boolean;
  /** graphics setting; "auto" follows the low-power probe */
  gfx: Gfx;
  /** the device looked slow when probed */
  autoLite: boolean;
  toasts: Toast[];
  setGfx: (g: Gfx) => void;
  setAutoLite: (v: boolean) => void;
  setSession: (player: PlayerDTO, results: LevelResultDTO[]) => void;
  setPlayer: (player: PlayerDTO) => void;
  setResult: (r: LevelResultDTO) => void;
  setFriends: (f: FriendDTO[]) => void;
  spendBoosterLocal: (id: InGameBooster) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
  logout: () => void;
}

let toastId = 1;

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? "on" : "off");
  } catch {}
}

function readGfx(): Gfx {
  try {
    const v = localStorage.getItem(GFX_KEY);
    return v === "high" || v === "low" ? v : "auto";
  } catch {
    return "auto";
  }
}

/** Lighter graphics: chosen by the player, or picked automatically on a slow device. */
export const selectLite = (s: { gfx: Gfx; autoLite: boolean }) => s.gfx === "low" || (s.gfx === "auto" && s.autoLite);

export const useGame = create<State>((set, get) => ({
  player: null,
  results: {},
  friends: [],
  sound: typeof window === "undefined" ? true : readFlag(SOUND_KEY),
  music: typeof window === "undefined" ? true : readFlag(MUSIC_KEY),
  gfx: typeof window === "undefined" ? "auto" : readGfx(),
  autoLite: false,
  toasts: [],
  setGfx: (gfx) => {
    try {
      localStorage.setItem(GFX_KEY, gfx);
    } catch {}
    set({ gfx });
  },
  setAutoLite: (autoLite) => set({ autoLite }),
  setSession: (player, results) => {
    try {
      localStorage.setItem(USERNAME_KEY, player.username);
    } catch {}
    set({ player, results: Object.fromEntries(results.map((r) => [r.level, r])) });
  },
  setPlayer: (player) => set({ player }),
  setResult: (r) => set({ results: { ...get().results, [r.level]: r } }),
  setFriends: (friends) => set({ friends }),
  spendBoosterLocal: (id) => {
    const p = get().player;
    if (p) set({ player: { ...p, boosters: { ...p.boosters, [id]: Math.max(0, p.boosters[id] - 1) } } });
  },
  toggleSound: () => {
    const sound = !get().sound;
    writeFlag(SOUND_KEY, sound);
    set({ sound });
  },
  toggleMusic: () => {
    const music = !get().music;
    writeFlag(MUSIC_KEY, music);
    set({ music });
  },
  toast: (text, tone = "info") => {
    const id = toastId++;
    set({ toasts: [...get().toasts, { id, text, tone }] });
    setTimeout(() => get().dismiss(id), 2600);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  logout: () => {
    try {
      localStorage.removeItem(USERNAME_KEY);
    } catch {}
    set({ player: null, results: {}, friends: [] });
  },
}));
