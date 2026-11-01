import { hashInt, mulberry32, pick, randInt, shuffleInPlace, type Rng } from "./rng";
import type { BlockerKind, Difficulty, GoalSpec, LevelConfig, ObstacleKind, Pos, SpecialKind } from "./types";

/** Boards are wide: the game is played in landscape. */
const COLS = 11;
const MID = (COLS - 1) / 2;

/* x = cell, . = hole. Every template is 11 columns wide and at most 9 rows tall. */
const T: Record<string, string[]> = {
  full: ["xxxxxxxxxxx", "xxxxxxxxxxx", "xxxxxxxxxxx", "xxxxxxxxxxx", "xxxxxxxxxxx", "xxxxxxxxxxx", "xxxxxxxxxxx", "xxxxxxxxxxx"],
  rounded: [
    ".xxxxxxxxx.",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
  ],
  tall: [
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
  ],
  castle: [
    "xx.xxxxx.xx",
    "xx.xxxxx.xx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxx...xxxx",
  ],
  bowtie: [
    "xxxx...xxxx",
    "xxxxx.xxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxx.xxxxx",
    "xxxx...xxxx",
  ],
  rooms: [
    "xxxx...xxxx",
    "xxxx...xxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxx...xxxx",
    "xxxx...xxxx",
    "xxxx...xxxx",
  ],
  diamond: [
    "...xxxxx...",
    "..xxxxxxx..",
    ".xxxxxxxxx.",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    "..xxxxxxx..",
    "...xxxxx...",
  ],
  plus: [
    "...xxxxx...",
    "...xxxxx...",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "...xxxxx...",
    "...xxxxx...",
  ],
  ring: [
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxx...xxxx",
    "xxxx...xxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
  ],
  heart: [
    ".xxxx.xxxx.",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    "..xxxxxxx..",
    "...xxxxx...",
    "....xxx....",
  ],
  cup: [
    "xxxx...xxxx",
    "xxxx...xxxx",
    "xxxx...xxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
  ],
  zigzag: [
    "xxxxxxxx...",
    "xxxxxxxx...",
    "xxxxxxxxxxx",
    "...xxxxxxxx",
    "...xxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxx...",
    "xxxxxxxx...",
  ],
  pyramid: [
    "....xxx....",
    "...xxxxx...",
    "..xxxxxxx..",
    ".xxxxxxxxx.",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
  ],
  bridge: [
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    ".xxxxxxxxx.",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxx.xxxxx",
  ],
  wings: [
    "xxx.....xxx",
    "xxxx...xxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxx...xxxx",
    "xxx.....xxx",
  ],
  butterfly: [
    "xx.......xx",
    "xxxx...xxxx",
    "xxxxx.xxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxx.xxxxx",
    "xxxx...xxxx",
    "xx.......xx",
  ],
  stairs: [
    "xxxxx......",
    "xxxxxx.....",
    "xxxxxxx....",
    "xxxxxxxx...",
    "...xxxxxxxx",
    "....xxxxxxx",
    ".....xxxxxx",
    "......xxxxx",
  ],
  mushroom: [
    "..xxxxxxx..",
    ".xxxxxxxxx.",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "...xxxxx...",
    "...xxxxx...",
    "...xxxxx...",
    "..xxxxxxx..",
  ],
  window: [
    "xxxxxxxxxxx",
    "xx..xxx..xx",
    "xx..xxx..xx",
    "xxxxxxxxxxx",
    "xxxxxxxxxxx",
    "xx..xxx..xx",
    "xx..xxx..xx",
    "xxxxxxxxxxx",
  ],
  wave: [
    "xxxxxxxxx..",
    "xxxxxxxxxx.",
    "xxxxxxxxxxx",
    ".xxxxxxxxxx",
    "..xxxxxxxxx",
    ".xxxxxxxxxx",
    "xxxxxxxxxxx",
    "xxxxxxxxxx.",
  ],
  arena: [
    "..xxxxxxx..",
    ".xxxxxxxxx.",
    "xxxxxxxxxxx",
    "xxxx...xxxx",
    "xxxx...xxxx",
    "xxxxxxxxxxx",
    ".xxxxxxxxx.",
    "..xxxxxxx..",
  ],
};

const EASY = ["full", "rounded", "tall", "castle"];
const ALL = Object.keys(T);

/**
 * 0 → 1 over levels 1…10 000: it rises quickly in the first worlds and then very slowly,
 * so even level 20 000 is a little harder than level 5 000 without ever becoming unfair.
 */
export function longTail(n: number): number {
  return Math.min(1, Math.log10(1 + n) / 4);
}

export function levelDifficulty(n: number): Difficulty {
  if (n >= 20 && n % 20 === 0) return "super";
  if (n >= 10 && n % 5 === 0) return "hard";
  return "normal";
}

interface Ctx {
  rows: number;
  mask: boolean[][];
  rng: Rng;
  taken: Set<number>;
}

const key = (r: number, c: number) => r * COLS + c;
const mirror = (c: number) => COLS - 1 - c;
const side = (c: number) => Math.min(c, mirror(c));

function where(ctx: Ctx, minRow: number, pred: (r: number, c: number) => boolean): Pos[] {
  const out: Pos[] = [];
  for (let r = minRow; r < ctx.rows; r++)
    for (let c = 0; c < COLS; c++) if (ctx.mask[r][c] && !ctx.taken.has(key(r, c)) && pred(r, c)) out.push({ r, c });
  return out;
}

type Pattern = (ctx: Ctx) => Pos[];

const BLOCKER_PATTERNS: Pattern[] = [
  (x) => {
    const k = randInt(x.rng, 2, 3);
    return where(x, 2, (r) => r >= x.rows - k);
  },
  (x) => {
    const r0 = randInt(x.rng, 2, x.rows - 3);
    return where(x, 2, (r) => r === r0 || r === r0 + 1);
  },
  (x) => {
    const cols = pick(x.rng, [
      [1, 9],
      [0, 10],
      [2, 8],
      [1, 5, 9],
      [0, 5, 10],
      [3, 7],
    ]);
    const start = randInt(x.rng, 2, 4);
    return where(x, 2, (r, c) => r >= start && cols.includes(c));
  },
  (x) => {
    const r0 = randInt(x.rng, 2, x.rows - 2);
    const c0 = randInt(x.rng, 0, 3);
    const r1 = randInt(x.rng, 2, x.rows - 2);
    return where(
      x,
      2,
      (r, c) => (r >= r0 && r <= r0 + 1 && side(c) >= c0 && side(c) <= c0 + 1) || (r >= r1 && r <= r1 + 1 && c === MID),
    );
  },
  (x) => {
    const r0 = randInt(x.rng, 2, 4);
    return where(x, 2, (r, c) => r >= r0 && (r + c) % 2 === 0);
  },
  (x) => where(x, 3, (r, c) => c === 0 || c === COLS - 1 || r === x.rows - 1),
  (x) => {
    const h = randInt(x.rng, 2, 3);
    const r0 = randInt(x.rng, 2, x.rows - h);
    return where(x, 2, (r, c) => r >= r0 && r < r0 + h && c >= 3 && c <= 7);
  },
  (x) => where(x, 2, (r, c) => Math.abs(c - MID) === x.rows - 1 - r || Math.abs(c - MID) === x.rows - 2 - r),
  (x) => {
    const base = x.rows - 3;
    return where(x, 2, (r, c) => r >= base && (c <= r - base || c >= COLS - 1 - (r - base)));
  },
  (x) => {
    const w = randInt(x.rng, 2, 3);
    return where(x, 2, (_, c) => side(c) < w);
  },
  (x) => {
    const out: Pos[] = [];
    const n = randInt(x.rng, 3, 6);
    const cand = shuffleInPlace(x.rng, where(x, 2, (_, c) => c <= MID));
    for (const p of cand.slice(0, n)) {
      out.push(p);
      if (p.c !== MID) out.push({ r: p.r, c: mirror(p.c) });
    }
    return out;
  },
];

const ICE_PATTERNS: Pattern[] = [
  (x) => where(x, 1, (r, c) => r <= x.rows - 2 && c >= 3 && c <= 7),
  (x) => where(x, 1, (r) => r >= x.rows - 3),
  (x) => {
    const mid = Math.floor(x.rows / 2);
    return where(x, 1, (r, c) => Math.abs(c - MID) === Math.abs(r - mid) || Math.abs(c - MID) === Math.abs(r - mid) + 1);
  },
  (x) =>
    where(
      x,
      1,
      (r, c) => (r === 1 || r === x.rows - 2 || c === 1 || c === COLS - 2) && r <= x.rows - 2 && c >= 1 && c <= COLS - 2,
    ),
  (x) => where(x, 1, (r) => r >= Math.floor(x.rows / 2)),
  (x) => where(x, 1, (r, c) => (r + c) % 2 === 1),
  (x) => where(x, 1, (_, c) => side(c) >= 3),
  (x) => where(x, 1, (_, c) => side(c) <= 2),
];

const LOCK_PATTERNS: Pattern[] = [
  (x) => {
    const r0 = randInt(x.rng, 2, x.rows - 2);
    return where(x, 1, (r, c) => r === r0 && c >= 2 && c <= 8);
  },
  (x) => where(x, 1, (r, c) => (c === 3 || c === 7) && r >= 2 && r <= x.rows - 2),
  (x) => {
    const mid = Math.floor(x.rows / 2);
    return where(x, 1, (r, c) => Math.abs(c - MID) === Math.abs(r - mid) + 1);
  },
  (x) => where(x, 1, (r, c) => (r === 2 || r === x.rows - 2) && (side(c) === 1 || side(c) === 3 || c === MID)),
  (x) => {
    const out: Pos[] = [];
    const cand = shuffleInPlace(x.rng, where(x, 1, (_, c) => c <= MID));
    for (const p of cand.slice(0, randInt(x.rng, 4, 7))) {
      out.push(p);
      if (p.c !== MID) out.push({ r: p.r, c: mirror(p.c) });
    }
    return out;
  },
];

const GRASS_SEEDS: Pattern[] = [
  (x) => where(x, 0, (r, c) => r === x.rows - 1 && Math.abs(c - MID) <= 1),
  (x) => where(x, 0, (r, c) => r >= x.rows - 2 && side(c) <= 1),
  (x) => where(x, 0, (r, c) => r === Math.floor(x.rows / 2) && Math.abs(c - MID) <= 1),
  (x) => where(x, 0, (r, c) => r <= 1 && side(c) === 0),
];

/** Keeps the bottom-most candidates (mirror pairs together) up to `max`. */
function limit(cells: Pos[], max: number): Pos[] {
  if (cells.length <= max) return cells;
  const sorted = [...cells].sort((a, b) => b.r - a.r || Math.abs(a.c - MID) - Math.abs(b.c - MID));
  const out: Pos[] = [];
  const seen = new Set<number>();
  for (const p of sorted) {
    if (seen.has(key(p.r, p.c))) continue;
    const m = mirror(p.c);
    const needed = m === p.c ? 1 : 2;
    if (out.length + needed > max) continue;
    out.push(p);
    seen.add(key(p.r, p.c));
    if (needed === 2 && cells.some((q) => q.r === p.r && q.c === m)) {
      out.push({ r: p.r, c: m });
      seen.add(key(p.r, m));
    }
  }
  return out;
}

function pickKinds(n: number, rng: Rng, difficulty: Difficulty): ObstacleKind[] {
  if (n <= 3) return [];
  if (n <= 7) return ["crate"];
  if (n <= 11) return n % 2 === 0 ? ["ice"] : ["ice", "crate"];
  if (n <= 15) return n % 2 === 0 ? ["cloud"] : ["cloud", "ice"];
  if (n <= 19) return n % 2 === 0 ? ["lock"] : ["lock", n === 17 ? "crate" : "ice"];
  if (n === 20) return ["cloud", "ice"];
  if (n === 21) return ["lock", "ice"];
  if (n <= 25) return n === 22 ? ["grass"] : ["grass", n === 24 ? "lock" : "ice"];
  const roll = rng();
  let count = roll < 0.12 ? 0 : roll < 0.45 ? 1 : roll < 0.85 || n < 35 ? 2 : 3;
  if (difficulty !== "normal") count = Math.max(count, 2);
  if (rng() < 0.2) {
    // A grass level: crates and clouds would leave cells that can never be covered.
    return ["grass", ...shuffleInPlace(rng, ["ice", "lock"] as ObstacleKind[]).slice(0, Math.max(0, count - 1))];
  }
  return shuffleInPlace(rng, ["crate", "cloud", "ice", "lock"] as ObstacleKind[]).slice(0, count);
}

const round5 = (x: number) => Math.max(5, Math.round(x / 5) * 5);

const SPECIAL_GOALS: { special: SpecialKind; min: number; max: number }[] = [
  { special: "rocketH", min: 4, max: 7 },
  { special: "bomb", min: 2, max: 4 },
  { special: "plane", min: 4, max: 6 },
  { special: "rainbow", min: 1, max: 2 },
];

export function generateLevel(level: number): LevelConfig {
  const n = Math.max(1, Math.floor(level));
  const rng = mulberry32(hashInt(n * 7919 + 1013));
  const difficulty = levelDifficulty(n);

  let rowsStr = T[n <= 3 ? "full" : n <= 8 ? pick(rng, EASY) : pick(rng, ALL)];
  if (rng() < 0.5) rowsStr = rowsStr.map((s) => [...s].reverse().join(""));
  const mask = rowsStr.map((s) => [...s].map((ch) => ch !== "."));
  const rows = mask.length;
  const cellCount = mask.flat().filter(Boolean).length;

  const kinds = pickKinds(n, rng, difficulty);
  const ctx: Ctx = { rows, mask, rng, taken: new Set() };
  const progress = longTail(n);
  const tierBoost = difficulty === "super" ? 0.06 : difficulty === "hard" ? 0.03 : 0;
  const maxBlockers = Math.floor(cellCount * (0.12 + progress * 0.2 + tierBoost));

  const blockers: LevelConfig["blockers"] = [];
  const ice: LevelConfig["ice"] = [];
  const locks: Pos[] = [];
  const grass: Pos[] = [];
  const hpFor = new Map<string, number>();
  const pairHp = (kind: string, r: number, c: number, roll: () => number) => {
    const k = `${kind}:${r}:${side(c)}`;
    if (!hpFor.has(k)) hpFor.set(k, roll());
    return hpFor.get(k)!;
  };
  const firstOf = (patterns: Pattern[], minCells: number, offset = 0) => {
    let cells: Pos[] = [];
    for (let tries = 0; tries < patterns.length && cells.length < minCells; tries++)
      cells = patterns[(offset + tries) % patterns.length](ctx);
    return cells;
  };

  const blockerKinds = kinds.filter((k): k is BlockerKind => k === "crate" || k === "cloud");
  const patterns = shuffleInPlace(rng, [...BLOCKER_PATTERNS]);
  blockerKinds.forEach((kind, i) => {
    const share = blockerKinds.length === 2 ? Math.floor(maxBlockers * 0.55) : maxBlockers;
    for (const p of limit(firstOf(patterns, 4, i * 3), share)) {
      ctx.taken.add(key(p.r, p.c));
      const hp =
        kind === "crate"
          ? pairHp(kind, p.r, p.c, () => {
              const p2 = n < 16 ? 0 : Math.min(0.55, (n - 15) / 40);
              const p3 = n < 30 ? 0 : Math.min(0.35, (n - 29) / 80);
              return 1 + (rng() < p2 ? 1 : 0) + (rng() < p3 ? 1 : 0);
            })
          : pairHp(kind, p.r, p.c, () => (n >= 35 && rng() < 0.4 ? 2 : 1));
      blockers.push({ r: p.r, c: p.c, kind, hp });
    }
  });

  if (kinds.includes("grass")) grass.push(...firstOf(shuffleInPlace(rng, [...GRASS_SEEDS]), 2));

  if (kinds.includes("lock")) {
    const maxLocks = Math.floor(cellCount * (0.07 + progress * 0.14 + tierBoost));
    for (const p of limit(firstOf(shuffleInPlace(rng, [...LOCK_PATTERNS]), 4), maxLocks)) {
      ctx.taken.add(key(p.r, p.c));
      locks.push(p);
    }
  }

  if (kinds.includes("ice")) {
    const maxIce = Math.floor(cellCount * (0.18 + progress * 0.26 + tierBoost));
    for (const p of limit(firstOf(shuffleInPlace(rng, [...ICE_PATTERNS]), 6), maxIce)) {
      const hp = pairHp("ice", p.r, p.c, () => (n >= 25 && rng() < Math.min(0.5, (n - 24) / 50) ? 2 : 1));
      ice.push({ r: p.r, c: p.c, hp });
    }
  }

  const colors = n <= 8 ? 4 : kinds.length >= 2 && rng() < 0.3 ? 4 : 5;

  const goals: GoalSpec[] = [];
  const crates = blockers.filter((b) => b.kind === "crate");
  const clouds = blockers.filter((b) => b.kind === "cloud");
  if (crates.length) goals.push({ kind: "crate", target: crates.length });
  if (clouds.length) goals.push({ kind: "cloud", target: clouds.length });
  if (ice.length) goals.push({ kind: "ice", target: ice.length });
  if (locks.length) goals.push({ kind: "lock", target: locks.length });
  if (grass.length) goals.push({ kind: "grass", target: cellCount - blockers.length - grass.length });

  let intro: LevelConfig["intro"];
  if (n === 4) intro = "crate";
  else if (n === 8) intro = "ice";
  else if (n === 12) intro = "cloud";
  else if (n === 16) intro = "lock";
  else if (n === 22) intro = "grass";
  else if (n === 28) intro = "special";

  if (intro === "special" || (n > 28 && goals.length <= 1 && rng() < 0.3)) {
    const sg = intro === "special" ? SPECIAL_GOALS[1] : pick(rng, SPECIAL_GOALS);
    goals.push({ kind: "special", special: sg.special, target: Math.round(sg.min + (sg.max - sg.min) * Math.min(1, n / 120)) });
  }

  const colorGoalCount =
    goals.length === 0
      ? n <= 2
        ? 1
        : randInt(rng, 2, 3)
      : goals.length === 1
        ? randInt(rng, 0, 1)
        : goals.length === 2
          ? rng() < 0.3
            ? 1
            : 0
          : 0;
  const palette = shuffleInPlace(rng, Array.from({ length: colors }, (_, i) => i));
  const tierAmount = difficulty === "super" ? 1.25 : difficulty === "hard" ? 1.12 : 1;
  const base = Math.min(10 + n * 0.35, 26 + 18 * progress) * tierAmount;
  const spread = colorGoalCount === 1 ? 1.4 : colorGoalCount === 2 ? 1 : 0.8;
  for (let i = 0; i < colorGoalCount; i++) {
    goals.push({ kind: "color", color: palette[i], target: Math.min(60, round5(base * spread * (0.85 + rng() * 0.3))) });
  }

  const moves = estimateMoves({ n, rows, colors, goals, blockers, ice, locks, difficulty });
  return { level: n, rows, cols: COLS, mask, colors, moves, goals, blockers, ice, locks, grass, difficulty, intro };
}

interface MoveInputs {
  n: number;
  rows: number;
  colors: number;
  goals: GoalSpec[];
  blockers: LevelConfig["blockers"];
  ice: LevelConfig["ice"];
  locks: Pos[];
  difficulty: Difficulty;
}

/** Rough moves per special-piece goal; greedy bots are bad at planning these, so they come from playtesting. */
const SPECIAL_COST: Record<string, number> = { rocketH: 1.6, bomb: 3, plane: 1.4, rainbow: 6 };

/** Moves a strong (greedy) player needs; weights fitted with scripts/simulate.ts. */
export function coreMoves(x: MoveInputs): number {
  const amounts = x.goals
    .filter((g) => g.kind === "color")
    .map((g) => g.target)
    .sort((a, b) => b - a);
  const rest = amounts.slice(1).reduce((s, a) => s + a, 0);
  const hp = (k: BlockerKind) => x.blockers.filter((b) => b.kind === k).reduce((s, b) => s + b.hp, 0);
  const iceHp = x.ice.reduce((s, i) => s + i.hp, 0);
  const grassCells = x.goals.find((g) => g.kind === "grass")?.target ?? 0;
  const special = x.goals
    .filter((g) => g.kind === "special")
    .reduce((s, g) => s + g.target * SPECIAL_COST[g.special!], 0);
  return (
    5.7 +
    0.035 * (amounts[0] ?? 0) * x.colors +
    0.0145 * rest * x.colors +
    0.35 * hp("crate") +
    0.49 * hp("cloud") +
    0.27 * iceHp +
    0.39 * x.locks.length +
    0.27 * grassCells +
    special
  );
}

function estimateMoves(x: MoveInputs): number {
  // Fewer spare moves as levels climb into the thousands, but only slightly.
  const late = Math.min(1, Math.max(0, (Math.log10(x.n) - 2) / 2));
  const slack =
    x.n <= 10
      ? 1.8
      : x.n <= 20
        ? 1.85
        : x.difficulty === "normal"
          ? 1.9 - 0.35 * late
          : x.difficulty === "hard"
            ? 1.45 - 0.15 * late
            : 1.3 - 0.1 * late;
  const kinds = new Set(x.goals.filter((g) => g.kind !== "color").map((g) => g.kind)).size;
  return Math.max(15, Math.min(50, Math.round(coreMoves(x) * slack + 3 + 2 * kinds)));
}
