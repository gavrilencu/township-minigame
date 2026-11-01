import type { Difficulty, SpecialKind } from "./types";

export const INGAME_BOOSTERS = ["hammer", "row", "col", "shuffle"] as const;
export const PRE_BOOSTERS = ["preRocket", "preBomb", "preRainbow"] as const;
export type InGameBooster = (typeof INGAME_BOOSTERS)[number];
export type PreBooster = (typeof PRE_BOOSTERS)[number];
export type BoosterId = InGameBooster | PreBooster;
export const BOOSTER_IDS: BoosterId[] = [...INGAME_BOOSTERS, ...PRE_BOOSTERS];

export type Inventory = Record<BoosterId, number>;

export const BOOSTERS: Record<BoosterId, { name: string; desc: string; price: number }> = {
  hammer: { name: "Ciocan", desc: "Sparge o piesă sau un strat de obstacol. Nu consumă mutări.", price: 90 },
  row: { name: "Rachetă orizontală", desc: "Curăță un rând întreg la alegere.", price: 130 },
  col: { name: "Rachetă verticală", desc: "Curăță o coloană întreagă la alegere.", price: 130 },
  shuffle: { name: "Amestecă", desc: "Rearanjează piesele de pe tablă.", price: 60 },
  preRocket: { name: "Start cu rachetă", desc: "Începi nivelul cu o rachetă pe tablă.", price: 80 },
  preBomb: { name: "Start cu bombă", desc: "Începi nivelul cu o bombă pe tablă.", price: 120 },
  preRainbow: { name: "Start cu glob", desc: "Începi nivelul cu un glob multicolor.", price: 200 },
};

export const PRE_TO_SPECIAL: Record<PreBooster, SpecialKind> = {
  preRocket: "rocketH",
  preBomb: "bomb",
  preRainbow: "rainbow",
};

export interface Bundle {
  id: string;
  name: string;
  desc: string;
  items: Partial<Inventory>;
  price: number;
}

export const BUNDLES: Bundle[] = [
  {
    id: "blast",
    name: "Pachetul Exploziv",
    desc: "2 bombe de start, 2 rachete de start și un ciocan",
    items: { preBomb: 2, preRocket: 2, hammer: 1 },
    price: 420,
  },
  {
    id: "chest",
    name: "Cufărul Bijutierului",
    desc: "Câte un pic din toate, cu un glob multicolor bonus",
    items: { hammer: 3, row: 2, col: 2, shuffle: 2, preRainbow: 1 },
    price: 990,
  },
];

export const START_COINS = 300;
export const START_INVENTORY: Inventory = {
  hammer: 2,
  row: 1,
  col: 1,
  shuffle: 2,
  preRocket: 1,
  preBomb: 1,
  preRainbow: 1,
};

export const CONTINUE_MOVES = 5;
export function continuePrice(nth: number): number {
  return [100, 160, 240][Math.max(0, Math.min(nth, 2))];
}

export const DAILY_REWARDS = [50, 70, 90, 120, 150, 200, 300];
export function dailyReward(streak: number): number {
  return DAILY_REWARDS[(Math.max(1, streak) - 1) % DAILY_REWARDS.length];
}

export function computeStars(movesLeft: number, totalMoves: number): 1 | 2 | 3 {
  const ratio = movesLeft / Math.max(1, totalMoves);
  if (ratio >= 0.3) return 3;
  if (ratio >= 0.12) return 2;
  return 1;
}

export interface Reward {
  total: number;
  parts: { label: string; value: number }[];
}

export function levelReward(x: {
  level: number;
  stars: number;
  movesLeft: number;
  firstClear: boolean;
  difficulty: Difficulty;
}): Reward {
  const parts: Reward["parts"] = [];
  parts.push({ label: "Nivel câștigat", value: 20 + Math.min(Math.floor(x.level / 5), 30) });
  parts.push({ label: `${x.stars} ${x.stars === 1 ? "stea" : "stele"}`, value: x.stars * 5 });
  if (x.movesLeft > 0) parts.push({ label: "Mutări rămase", value: Math.min(x.movesLeft, 20) * 2 });
  if (x.difficulty !== "normal") parts.push({ label: x.difficulty === "super" ? "Nivel super greu" : "Nivel greu", value: x.difficulty === "super" ? 40 : 20 });
  if (x.firstClear && x.level % 20 === 0) parts.push({ label: "Cufăr de lume", value: 150 });
  if (!x.firstClear) {
    const total = Math.max(5, Math.round(parts.reduce((s, p) => s + p.value, 0) * 0.35));
    return { total, parts: [{ label: "Nivel rejucat", value: total }] };
  }
  return { total: parts.reduce((s, p) => s + p.value, 0), parts };
}

export const MAX_SCORE = 2_000_000;
